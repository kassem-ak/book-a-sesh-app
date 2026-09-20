import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { DatePickerSheet } from './DatePickerSheet';
import { Field, Icon, Row, SectionHeading, VoltButton } from './ui';
import {
  addPeriod, Blackout, blackoutLabel, closeDate, daysInRange, fetchMyBlackouts,
  fetchMyWeek, MAX_PERIODS_PER_DAY, openDate, parsePeriodInput, Period, periodLabel,
  periodsFromSlots, saveDayPeriods, Week,
} from '../lib/availability';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// When a coach works.
//
// `coach_availability` keys weekday 0=Mon..6=Sun, so DAYS is in that order and
// the index IS the weekday -- no lookup table to get wrong.
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function CoachAvailability() {
  const { c, t } = useTheme();
  const s = useStore();
  const [week, setWeek] = useState<Week | null>(null);
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
  const [formError, setFormError] = useState<string | null>(null);

  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [rows, closed] = await Promise.all([fetchMyWeek(), fetchMyBlackouts()]);
      setWeek(rows);
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

  const periodsOn = (weekday: number) => periodsFromSlots(week?.[weekday] ?? []);
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
    void run(async () => {
      for (const day of targetDays) {
        await saveDayPeriods(day, addPeriod(periodsOn(day), parsed.period));
      }
      track('coach_hours_saved');
    });
  };

  const dropPeriod = (weekday: number, index: number) =>
    void run(() => saveDayPeriods(weekday, periodsOn(weekday).filter((_, i) => i !== index)));

  const worked = week ? [0, 1, 2, 3, 4, 5, 6].filter((day) => periodsOn(day).length > 0) : [];

  return (
    <View style={{ gap: 16 }}>
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
        {worked.length === 0 && (
          <Text style={[t.bodySm, { color: c.txt3 }]}>
            You have no hours set, so nobody can book you yet.
          </Text>
        )}

        {worked.map((day) => (
          <View key={day} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 12, gap: 8 }}>
            <Text style={[t.labelSm, { color: c.txt }]}>{DAY_NAMES[day]}</Text>
            {periodsOn(day).map((period, index) => (
              <Row key={`${period.startsAt}-${period.endsAt}`} gap={10} style={{ alignItems: 'center' }}>
                <Text style={[t.body, { color: c.accent, flex: 1 }]}>{periodLabel(period)}</Text>
                <Pressable accessibilityRole="button" disabled={busy}
                  accessibilityLabel={`Remove ${periodLabel(period)} on ${DAY_NAMES[day]}`}
                  onPress={() => dropPeriod(day, index)}
                  style={{ minHeight: 44, width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Icon name="trash-2" size={17} color={c.txt3} />
                </Pressable>
              </Row>
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

          <DayPicker label={spanDays ? 'From' : 'Day'} value={fromDay} onChange={setFromDay} />
          {spanDays && <DayPicker label="To" value={toDay} onChange={setToDay} />}

          <Row gap={10} style={{ alignItems: 'center' }}>
            <TimeInput label="Start" value={startText} onChange={setStartText} />
            <Text style={[t.bodySm, { color: c.txt3 }]}>to</Text>
            <TimeInput label="Finish" value={endText} onChange={setEndText} />
          </Row>

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
            <Pressable accessibilityRole="button" disabled={busy}
              accessibilityLabel={`Reopen ${blackoutLabel(entry.date)}`}
              onPress={() => void run(() => openDate(entry.date))}
              style={{ minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash-2" size={18} color={c.txt3} />
            </Pressable>
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

function DayPicker({ label, value, onChange }: {
  label: string; value: number; onChange: (day: number) => void;
}) {
  const { c, t } = useTheme();
  return (
    <Row gap={10} style={{ alignItems: 'center' }}>
      <Text style={[t.bodySm, { color: c.txt3, width: 44 }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {DAYS.map((day, index) => {
          const active = value === index;
          return (
            <Pressable key={day} onPress={() => onChange(index)}
              accessibilityRole="radio" accessibilityState={{ selected: active }}
              accessibilityLabel={`${label} ${DAY_NAMES[index]}`}
              style={{ borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1,
                borderColor: active ? c.volt : c.line,
                backgroundColor: active ? c.volt : c.surface }}>
              <Text style={[t.caption, { color: active ? c.ink : c.txt2 }]}>{day}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Row>
  );
}

// Typed, not stepped.
//
// Stepping to 8:00 PM from 9:00 AM is twenty-two taps. What the input accepts
// is deliberately wide -- "9", "9:30", "17:30", "5 pm" -- and what it refuses
// it refuses out loud, because a time silently rounded to the nearest half hour
// is a schedule the coach did not agree to.
function TimeInput({ label, value, onChange }: {
  label: string; value: string; onChange: (text: string) => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[t.caption, { color: c.txt3, marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="9:00 AM"
        placeholderTextColor={c.txt3}
        accessibilityLabel={label}
        autoCapitalize="characters"
        autoCorrect={false}
        style={[t.label, { color: c.txt, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1,
          borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44 }]}
      />
    </View>
  );
}
