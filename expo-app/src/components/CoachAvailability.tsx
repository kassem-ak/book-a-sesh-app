import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { DatePickerSheet } from './DatePickerSheet';
import { ConfirmIconButton } from './ItemMenu';
import { ConfirmSheet, Field, Icon, Row, SectionHeading, VoltButton } from './ui';
import {
  addPeriod, Blackout, blackoutLabel, cleanNote, closeDate, daysInRange, fetchMyBlackouts,
  fetchMyWeek, groupWeek, maskTimeInput, MAX_NOTE_LENGTH, MAX_PERIODS_PER_DAY, normaliseTimeInput,
  noteKey, openDate, parsePeriodInput, Period, periodLabel, periodsFromSlots, saveDayPeriods,
  SlotNotes, Week,
} from '../lib/availability';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, useStore } from '../state/store';
import { alpha, radii, useTheme } from '../theme';

// When a coach works.
//
// `coach_availability` keys weekday 0=Mon..6=Sun, so DAY_NAMES is in that
// order and the index IS the weekday -- no lookup table to get wrong.
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function CoachAvailability() {
  const { c, t } = useTheme();
  const s = useStore();
  const [week, setWeek] = useState<Week | null>(null);
  const [notes, setNotes] = useState<SlotNotes>({});
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The form adds hours to one day or to a run of days at once. Most coaches
  // work the same hours Monday to Friday, and setting that five times was five
  // chances to make them disagree.
  const [spanDays, setSpanDays] = useState(false);
  const [fromDay, setFromDay] = useState(0);
  const [toDay, setToDay] = useState(4);
  const [startText, setStartText] = useState('9:00 AM');
  const [endText, setEndText] = useState('5:00 PM');
  const [noteText, setNoteText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [hours, closed] = await Promise.all([fetchMyWeek(), fetchMyBlackouts()]);
      setWeek(hours.week);
      setNotes(hours.notes);
      setBlackouts(closed);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => { void load(); }, [load, s.authUserId]);

  // Every write re-reads. Patching local state optimistically would let the
  // screen show an opening the server refused, and a schedule that lies is
  // worse than one that is briefly a beat behind.
  const run = async (write: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await write();
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  const periodsOn = (weekday: number) => periodsFromSlots(
    week?.[weekday] ?? [],
    (slot) => notes[noteKey(weekday, slot)],
  );
  const targetDays = spanDays ? daysInRange(fromDay, toDay) : [fromDay];

  const addHours = () => {
    const parsed = parsePeriodInput(startText, endText);
    if ('error' in parsed) { setFormError(parsed.error); return; }

    // Refused before any of the days are written, so a range cannot half-apply
    // and leave the coach with hours on Monday and none on Tuesday.
    const full = targetDays.filter((day) => {
      const merged = addPeriod(periodsOn(day), parsed.period);
      return merged.length > MAX_PERIODS_PER_DAY;
    });
    if (full.length) {
      setFormError(
        `${full.map((day) => DAY_NAMES[day]).join(', ')} would have more than ${MAX_PERIODS_PER_DAY} periods. `
        + 'Remove some hours there first, or widen the ones already set.',
      );
      return;
    }

    setFormError(null);
    const adding: Period = { ...parsed.period, note: cleanNote(noteText) };
    void run(async () => {
      for (const day of targetDays) {
        await saveDayPeriods(day, addPeriod(periodsOn(day), adding));
      }
      setNoteText('');
      track('coach_hours_saved');
    });
  };

  // Editing an existing entry's note, inline in the card it belongs to. A
  // sheet would cover the hours the note is about, which is the one thing the
  // coach needs to see while writing it.
  const [editing, setEditing] = useState<{ days: number[]; period: Period } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const isEditing = (days: number[], period: Period) =>
    editing !== null
    && editing.period.startsAt === period.startsAt
    && editing.period.endsAt === period.endsAt
    && editing.days.join('-') === days.join('-');

  const saveNote = (days: number[], period: Period) =>
    void run(async () => {
      for (const day of days) {
        await saveDayPeriods(day, periodsOn(day).map((p) => (
          p.startsAt === period.startsAt && p.endsAt === period.endsAt
            ? { ...p, note: cleanNote(noteDraft) }
            : p
        )));
      }
      setEditing(null);
    });

  // Removing from a group removes from every day in it. The hours were added
  // across those days in one go, and taking them back one day at a time would
  // be a different gesture than the one that made them.
  // Always asked for. It used to be asked only when the group spanned several
  // days, which made the same trash can safe or not depending on how the week
  // happened to group -- and losing one day's hours is still losing them.
  const [dropping, setDropping] = useState<{ days: number[]; period: Period } | null>(null);

  const dropPeriod = (days: number[], period: Period) =>
    void run(async () => {
      for (const day of days) {
        await saveDayPeriods(day, periodsOn(day).filter(
          (p) => p.startsAt !== period.startsAt || p.endsAt !== period.endsAt,
        ));
      }
      setDropping(null);
    });

  const groups = week ? groupWeek(week, notes) : [];
  const groupLabel = (days: number[]) =>
    days.length === 1
      ? DAY_NAMES[days[0]]
      : `${DAY_NAMES[days[0]]} – ${DAY_NAMES[days[days.length - 1]]}`;

  return (
    <View style={{ gap: 16 }}>
      <ConfirmSheet
        visible={dropping !== null}
        title="Remove these hours?"
        body={dropping
          ? (dropping.days.length === 1
            ? `${periodLabel(dropping.period)} comes off ${groupLabel(dropping.days)}. `
            : `${periodLabel(dropping.period)} comes off every day in `
              + `${groupLabel(dropping.days)} — ${dropping.days.length} days. `)
            + 'Sessions already booked in those hours are not affected.'
          : ''}
        confirmLabel="Remove them"
        busy={busy}
        busyLabel="Removing…"
        onConfirm={() => { if (dropping) dropPeriod(dropping.days, dropping.period); }}
        onCancel={() => setDropping(null)}
      />
      <SectionHeading>When you coach</SectionHeading>
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        Add the hours you work — one day, or a run of days at once. Up to {MAX_PERIODS_PER_DAY} periods a day, so a
        morning and an evening can have a gap between them.
      </Text>
      {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
      {week === null && !error && (
        <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading your hours…</Text>
      )}

      {week !== null && <>
        {groups.length === 0 && (
          <Text style={[t.bodySm, { color: c.txt3 }]}>
            You have no hours set, so nobody can book you yet.
          </Text>
        )}

        {groups.map((group) => (
          <View key={group.days.join('-')}
            style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 12, gap: 8 }}>
            <Row gap={8} style={{ alignItems: 'center' }}>
              <Text style={[t.labelSm, { color: c.txt }]}>{groupLabel(group.days)}</Text>
              {group.days.length > 1 && (
                <Text style={[t.caption, { color: c.txt3 }]}>
                  {group.days.length} days, same hours
                </Text>
              )}
            </Row>
            {group.periods.map((period) => (
              <View key={`${period.startsAt}-${period.endsAt}`} style={{ gap: 6 }}>
                <Row gap={10} style={{ alignItems: 'center' }}>
                  <Text style={[t.body, { color: c.accent, flex: 1 }]}>{periodLabel(period)}</Text>
                  <Pressable accessibilityRole="button" disabled={busy}
                    accessibilityLabel={period.note
                      ? `Edit the comment on ${periodLabel(period)}, ${groupLabel(group.days)}`
                      : `Add a comment to ${periodLabel(period)}, ${groupLabel(group.days)}`}
                    onPress={() => {
                      if (isEditing(group.days, period)) { setEditing(null); return; }
                      setNoteDraft(period.note ?? '');
                      setEditing({ days: group.days, period });
                    }}
                    style={{ minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={period.note ? 'message-square' : 'plus'} size={17}
                      color={period.note ? c.accent : c.txt3} />
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={busy}
                    accessibilityLabel={`Remove ${periodLabel(period)} on ${groupLabel(group.days)}`}
                    onPress={() => setDropping({ days: group.days, period })}
                    style={{ minHeight: 44, width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Icon name="trash-2" size={17} color={c.txt3} />
                  </Pressable>
                </Row>

                {/* The note as clients read it, when it is not being edited. */}
                {period.note && !isEditing(group.days, period) && (
                  <Text style={[t.bodySm, { color: c.txt2 }]}>{period.note}</Text>
                )}

                {isEditing(group.days, period) && (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      value={noteDraft}
                      onChangeText={setNoteDraft}
                      maxLength={MAX_NOTE_LENGTH}
                      multiline
                      editable={!busy}
                      placeholder="Juniors only, outdoor, bring your own mat…"
                      placeholderTextColor={c.txt3}
                      accessibilityLabel={`Comment on ${periodLabel(period)}, ${groupLabel(group.days)}`}
                      style={[t.bodySm, {
                        color: c.txt, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1,
                        borderRadius: radii.input, paddingHorizontal: 12, paddingVertical: 10, minHeight: 60,
                      }]}
                    />
                    <Text style={[t.caption, { color: c.txt3 }]}>
                      {group.days.length > 1
                        ? `Clients see this on all ${group.days.length} days.`
                        : 'Clients see this next to your hours.'}
                    </Text>
                    <Row gap={8}>
                      <VoltButton label="Save comment" busy={busy}
                        onPress={() => saveNote(group.days, period)} />
                      <Pressable accessibilityRole="button" accessibilityLabel="Cancel" disabled={busy}
                        onPress={() => setEditing(null)}
                        style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}>
                        <Text style={[t.labelSm, { color: c.txt2 }]}>Cancel</Text>
                      </Pressable>
                    </Row>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: 14, padding: 12, gap: 12 }}>
          <Row gap={8}>
            {[
              { key: false, label: 'One day' },
              { key: true, label: 'Day range' },
            ].map((option) => {
              const active = spanDays === option.key;
              return (
                <Pressable key={option.label} onPress={() => setSpanDays(option.key)}
                  accessibilityRole="radio" accessibilityState={{ selected: active }}
                  accessibilityLabel={option.label}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                    borderColor: active ? c.volt : c.line,
                    backgroundColor: active ? alpha(c.volt, 0.14) : c.surface }}>
                  <Text style={[t.labelSm, { color: active ? c.accent : c.txt2 }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </Row>

          {/* Side by side: From and To are one answer, read left to right.
              Each column owns its own open list, so a menu drops under the
              control that opened it rather than under the pair. */}
          <Row gap={10} style={{ alignItems: 'flex-start' }}>
            <DayPicker label={spanDays ? 'From' : 'Day'} value={fromDay} onChange={setFromDay} />
            {spanDays && <DayPicker label="To" value={toDay} onChange={setToDay} />}
          </Row>

          <Row gap={10} style={{ alignItems: 'center' }}>
            <TimeInput label="Start" value={startText} onChange={setStartText} />
            <Text style={[t.bodySm, { color: c.txt3 }]}>to</Text>
            <TimeInput label="Finish" value={endText} onChange={setEndText} />
          </Row>

          {/* Optional, and last: hours are the point of this form and a comment
              is a thing you add to them. Labelled as public so nobody writes a
              reminder to themselves on their own shop window. */}
          <View style={{ gap: 6 }}>
            <Text style={[t.caption, { color: c.txt3 }]}>Comment (optional, clients see it)</Text>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              maxLength={MAX_NOTE_LENGTH}
              multiline
              editable={!busy}
              placeholder="Juniors only, outdoor, bring your own mat…"
              placeholderTextColor={c.txt3}
              accessibilityLabel="Comment on these hours, optional, clients see it"
              style={[t.bodySm, {
                color: c.txt, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1,
                borderRadius: radii.input, paddingHorizontal: 12, paddingVertical: 10, minHeight: 60,
              }]}
            />
          </View>

          {formError
            ? <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{formError}</Text>
            : <Text style={[t.caption, { color: c.txt3 }]}>
                On the hour or half hour. 9:00 AM, 9:30, 17:30 and 5 pm all work.
              </Text>}

          <VoltButton
            label={spanDays
              ? `Add hours · ${DAY_NAMES[fromDay]} to ${DAY_NAMES[toDay]}`
              : `Add hours · ${DAY_NAMES[fromDay]}`}
            busy={busy} busyLabel="Saving…" enabled={!busy} onPress={addHours} />
        </View>

        <Text style={[t.caption, { color: c.txt3 }]}>
          Sessions already booked are not affected by a change here.
        </Text>

        <SectionHeading>Days off</SectionHeading>
        <Text style={[t.bodySm, { color: c.txt2 }]}>
          Dates you are away, whatever your weekly hours say. Nobody can book you on a closed date.
        </Text>

        {blackouts.length === 0 && (
          <Text style={[t.bodySm, { color: c.txt3 }]}>No days off coming up.</Text>
        )}

        {blackouts.map((entry) => (
          <Row key={entry.date} gap={10}
            style={{ alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[t.name, { color: c.txt }]}>{blackoutLabel(entry.date)}</Text>
              {entry.reason ? <Text style={[t.bodySm, { color: c.txt2 }]}>{entry.reason}</Text> : null}
            </View>
            <ConfirmIconButton
              icon="trash-2"
              accessibilityLabel={`Reopen ${blackoutLabel(entry.date)}`}
              confirm={{
                title: `Reopen ${blackoutLabel(entry.date)}?`,
                body: 'You become bookable on that day again.',
                confirmLabel: 'Reopen it',
              }}
              busy={busy}
              size={18}
              onPress={() => void run(() => openDate(entry.date))}
            />
          </Row>
        ))}

        <VoltButton label="Add a day off" enabled={!busy}
          onPress={() => { setReason(''); setError(null); setPicking(true); }} />

        <DatePickerSheet
          visible={picking}
          title="Add a day off"
          subtitle="Nobody can book you on this date, whatever your weekly hours say."
          confirmLabel="Close this date"
          busy={busy}
          taken={blackouts.map((b) => b.date)}
          onClose={() => setPicking(false)}
          onConfirm={(date) => void run(async () => {
            await closeDate(date, reason);
            track('coach_day_off_added');
            setPicking(false);
          })}
        >
          <Field value={reason} onChange={setReason} label="Why, optionally"
            placeholder="Competition, holiday, away" />
        </DatePickerSheet>
      </>}
    </View>
  );
}

// A dropdown, not a strip of seven chips.
//
// The chips were a horizontal scroll inside a vertical one: on a narrow phone
// the last two days sat off the edge, and a drag meant to reach Sunday moved
// the page instead. Seven fixed options with one answer is what a dropdown is
// for, and the closed state says the current day in full rather than in three
// letters.
function DayPicker({ label, value, onChange }: {
  label: string; value: number; onChange: (day: number) => void;
}) {
  const { c, t } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={[t.caption, { color: c.txt3 }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen((shown) => !shown)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${DAY_NAMES[value]}`}
        accessibilityHint="Choose a day"
        accessibilityState={{ expanded: open }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          backgroundColor: c.surface,
          borderColor: open ? c.volt : c.line,
          borderWidth: 1,
          borderRadius: radii.input,
          paddingHorizontal: 14,
        }}
      >
        <Text numberOfLines={1} style={[t.body, { color: c.txt, flex: 1 }]}>{DAY_NAMES[value]}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.txt3} />
      </Pressable>
      {open && (
        <View style={{
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: radii.input,
          padding: 6,
        }}>
          {DAY_NAMES.map((name, index) => {
            const active = value === index;
            return (
              <Pressable
                key={name}
                onPress={() => { onChange(index); setOpen(false); }}
                accessibilityRole="menuitem"
                accessibilityLabel={name}
                accessibilityState={{ selected: active }}
                style={{
                  minHeight: 48,
                  justifyContent: 'center',
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: active ? alpha(c.volt, 0.14) : 'transparent',
                }}
              >
                <Text style={[t.label, { color: active ? c.accent : c.txt }]}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Typed, not stepped -- and masked as it is typed.
//
// Stepping to 8:00 PM from 9:00 AM is twenty-two taps. Typing it is four, and
// the colon and the meridiem are not among them: digits fall into H:MM on their
// own, and leaving the field finishes the job, so "930" settles as "9:30 AM"
// and "1730" as "5:30 PM".
//
// The mask shapes, it does not police. Rejecting keystrokes as they are typed
// makes a field feel broken, because half of every valid time is an invalid
// prefix of it -- so what is genuinely wrong is refused on submit, out loud,
// with the reason.
function TimeInput({ label, value, onChange }: {
  label: string; value: string; onChange: (text: string) => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[t.caption, { color: c.txt3, marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(maskTimeInput(text))}
        onBlur={() => onChange(normaliseTimeInput(value))}
        placeholder="9:00 AM"
        placeholderTextColor={c.txt3}
        accessibilityLabel={label}
        accessibilityHint="Type the digits. The colon and AM or PM are added for you."
        // The mask inserts the punctuation, so the numeric pad is all anyone
        // needs -- except for the a/p that picks the meridiem, which is why
        // this stays a normal keyboard rather than a number pad.
        autoCapitalize="characters"
        autoCorrect={false}
        style={[t.label, { color: c.txt, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1,
          borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44 }]}
      />
    </View>
  );
}
