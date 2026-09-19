import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { DatePickerSheet } from './DatePickerSheet';
import { Field, Icon, Row, SectionHeading, VoltButton } from './ui';
import {
  Blackout, blackoutLabel, closeDate, DAY_ENDS_AT, DAY_STARTS_AT, fetchMyBlackouts,
  fetchMyWeek, labelFromMinutes, MAX_PERIODS_PER_DAY, openDate, Period, periodsFromSlots,
  saveDayPeriods, SLOT_MINUTES, suggestedPeriod, Week,
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
  const [weekday, setWeekday] = useState(0);
  // The day being edited, held apart from what is saved so a half-dragged range
  // is never written. Null means "showing what the server has".
  const [draft, setDraft] = useState<Period[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [rows, closed] = await Promise.all([fetchMyWeek(), fetchMyBlackouts()]);
      setWeek(rows);
      setBlackouts(closed);
      setDraft(null);
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

  const saved = React.useMemo(
    () => periodsFromSlots(week?.[weekday] ?? []),
    [week, weekday],
  );
  const periods = draft ?? saved;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  const edit = (next: Period[]) => setDraft(next);
  const editPeriod = (index: number, change: Partial<Period>) =>
    edit(periods.map((p, i) => (i === index ? { ...p, ...change } : p)));

  return (
    <View style={{ gap: 16 }}>
      <SectionHeading>When you coach</SectionHeading>
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        Pick a day, then the hours you work on it. Up to two periods a day, so a morning and an evening can have a gap between them.
      </Text>
      {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
      {week === null && !error && (
        <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading your hours…</Text>
      )}

      {week !== null && <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {DAYS.map((label, index) => {
            const selected = weekday === index;
            const works = (week[index] ?? []).length > 0;
            return (
              <Pressable key={label}
                onPress={() => { setWeekday(index); setDraft(null); }}
                accessibilityRole="radio" accessibilityState={{ selected }}
                accessibilityLabel={`${DAY_NAMES[index]}, ${works ? 'working' : 'not working'}`}
                style={{ borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, minWidth: 56, alignItems: 'center',
                  borderWidth: 1, borderColor: selected ? c.volt : c.line,
                  backgroundColor: selected ? c.volt : c.surface }}>
                <Text style={[t.caption, { color: selected ? c.ink : c.txt3 }]}>{label}</Text>
                {/* A dot rather than a count: which days you work is the thing
                    to see at a glance. */}
                <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 4,
                  backgroundColor: works ? (selected ? c.ink : c.volt) : 'transparent' }} />
              </Pressable>
            );
          })}
        </ScrollView>

        {periods.length === 0 && (
          <Text style={[t.bodySm, { color: c.txt3 }]}>
            {DAY_NAMES[weekday]} is a day off. Add hours to open it.
          </Text>
        )}

        {periods.map((period, index) => (
          <View key={index} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 12, gap: 10 }}>
            <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[t.labelSm, { color: c.txt2 }]}>
                {index === 0 ? 'First period' : 'Second period'}
              </Text>
              <Pressable accessibilityRole="button" disabled={busy}
                accessibilityLabel={`Remove ${index === 0 ? 'first' : 'second'} period on ${DAY_NAMES[weekday]}`}
                onPress={() => edit(periods.filter((_, i) => i !== index))}
                style={{ minHeight: 44, width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Icon name="trash-2" size={17} color={c.txt3} />
              </Pressable>
            </Row>
            <TimeStepper label="From" value={period.startsAt}
              min={DAY_STARTS_AT} max={period.endsAt - SLOT_MINUTES}
              onChange={(startsAt) => editPeriod(index, { startsAt })} />
            <TimeStepper label="To" value={period.endsAt}
              min={period.startsAt + SLOT_MINUTES} max={DAY_ENDS_AT}
              onChange={(endsAt) => editPeriod(index, { endsAt })} />
          </View>
        ))}

        {periods.length < MAX_PERIODS_PER_DAY && (
          <Pressable accessibilityRole="button" disabled={busy}
            accessibilityLabel={`Add hours on ${DAY_NAMES[weekday]}`}
            onPress={() => edit([...periods, suggestedPeriod(periods)])}
            style={{ minHeight: 46, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed',
              borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[t.label, { color: c.accent }]}>
              {periods.length === 0 ? '+ Add working hours' : '+ Add a second period'}
            </Text>
          </Pressable>
        )}

        {dirty && (
          <Row gap={12}>
            <View style={{ flex: 1 }}>
              <VoltButton label={`Save ${DAY_NAMES[weekday]}`} busy={busy} busyLabel="Saving…"
                enabled={!busy}
                onPress={() => void run(async () => {
                  await saveDayPeriods(weekday, periods);
                  track('coach_hours_saved');
                })} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Discard these changes"
              onPress={() => setDraft(null)} disabled={busy}
              style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
              <Text style={[t.label, { color: c.txt2 }]}>Undo</Text>
            </Pressable>
          </Row>
        )}
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

// Half-hour steps rather than a free text time.
//
// The stored slots are on a half-hour grid, so a typed "9:17" would have to be
// rounded into something the coach did not ask for. Stepping can only produce a
// time the schedule can actually hold, and the bounds mean a period can never
// end before it starts.
function TimeStepper({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (value: number) => void;
}) {
  const { c, t } = useTheme();
  const canBack = value > min;
  const canForward = value < max;
  return (
    <Row gap={10} style={{ alignItems: 'center' }}>
      <Text style={[t.bodySm, { color: c.txt3, width: 42 }]}>{label}</Text>
      <Row gap={8} style={{ alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
        <Step label="−" enabled={canBack} onPress={() => onChange(value - SLOT_MINUTES)}
          accessibilityLabel={`${label} half an hour earlier`} />
        <View style={{ minWidth: 92, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10,
          borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: alpha(c.volt, 0.1) }}>
          <Text accessibilityLiveRegion="polite" style={[t.labelSm, { color: c.accent }]}>
            {labelFromMinutes(value)}
          </Text>
        </View>
        <Step label="+" enabled={canForward} onPress={() => onChange(value + SLOT_MINUTES)}
          accessibilityLabel={`${label} half an hour later`} />
      </Row>
    </Row>
  );
}

function Step({ label, enabled, onPress, accessibilityLabel }: {
  label: string; enabled: boolean; onPress: () => void; accessibilityLabel: string;
}) {
  const { c, t } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !enabled }} disabled={!enabled} onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, opacity: enabled ? 1 : 0.35 }}>
      <Text style={[t.label, { color: c.txt }]}>{label}</Text>
    </Pressable>
  );
}
