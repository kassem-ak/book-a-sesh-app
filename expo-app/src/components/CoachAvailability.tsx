import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Field, FormSheet, Icon, Row, SectionHeading, VoltButton } from './ui';
import {
  Blackout, blackoutLabel, closeDate, closeSlot, dateKey, fetchMyBlackouts,
  fetchMyWeek, openDate, openSlot, Week,
} from '../lib/availability';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, SCHED_TIMES, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// When a coach works.
//
// `coach_availability` keys weekday 0=Mon..6=Sun, so DAYS is in that order and
// the index IS the weekday -- no lookup table to get wrong.
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// How far ahead the "close a date" picker offers. Long enough for a holiday
// two months out, short enough that the list is scrollable rather than endless.
const DAYS_AHEAD = 90;

export function CoachAvailability() {
  const { c, t } = useTheme();
  const s = useStore();
  const [week, setWeek] = useState<Week | null>(null);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [weekday, setWeekday] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [reason, setReason] = useState('');
  const [chosenDate, setChosenDate] = useState<string | null>(null);

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

  const slots = week?.[weekday] ?? [];
  const closedSet = new Set(blackouts.map((b) => b.date));

  const upcoming = React.useMemo(() => {
    const out: { date: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < DAYS_AHEAD; i += 1) {
      const at = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const date = dateKey(at);
      out.push({ date, label: blackoutLabel(date) });
    }
    return out;
  }, []);

  return (
    <View style={{ gap: 16 }}>
      <SectionHeading>When you coach</SectionHeading>
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        The hours clients can book, day by day. Each change saves as you make it. Sessions already booked are not affected.
      </Text>
      {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
      {week === null && !error && (
        <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading your hours…</Text>
      )}

      {week !== null && <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {DAYS.map((label, index) => {
            const selected = weekday === index;
            const open = (week[index] ?? []).length;
            return (
              <Pressable key={label} onPress={() => setWeekday(index)}
                accessibilityRole="radio" accessibilityState={{ selected }}
                accessibilityLabel={`${DAY_NAMES[index]}, ${open} ${open === 1 ? 'hour' : 'hours'} open`}
                style={{ borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, minWidth: 56, alignItems: 'center',
                  borderWidth: 1, borderColor: selected ? c.volt : c.line,
                  backgroundColor: selected ? c.volt : c.surface }}>
                <Text style={[t.caption, { color: selected ? c.ink : c.txt3 }]}>{label}</Text>
                {/* A dot rather than a number: which days you work is the thing
                    to see at a glance, not how many slots each has. */}
                <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 4,
                  backgroundColor: open ? (selected ? c.ink : c.volt) : 'transparent' }} />
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[t.caption, { color: c.txt3 }]}>
          {slots.length
            ? `${DAY_NAMES[weekday]} · ${slots.length} ${slots.length === 1 ? 'hour' : 'hours'} open. Tap to close.`
            : `${DAY_NAMES[weekday]} is closed. Tap an hour to open it.`}
        </Text>

        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {SCHED_TIMES.map((slot) => {
            const open = slots.includes(slot);
            return (
              <Pressable key={slot} disabled={busy}
                onPress={() => void run(() => (open ? closeSlot(weekday, slot) : openSlot(weekday, slot)))}
                accessibilityRole="checkbox" accessibilityState={{ checked: open, disabled: busy }}
                accessibilityLabel={`${slot} on ${DAY_NAMES[weekday]}`}
                style={{ borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1,
                  borderColor: open ? c.volt : c.line,
                  backgroundColor: open ? alpha(c.volt, 0.14) : c.surface }}>
                <Text style={[t.labelSm, { color: open ? c.accent : c.txt2 }]}>{slot}</Text>
              </Pressable>
            );
          })}
        </Row>

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
          onPress={() => { setChosenDate(null); setReason(''); setError(null); setPicking(true); }} />

        <FormSheet
          visible={picking}
          title="Add a day off"
          subtitle="Nobody can book you on this date, whatever your weekly hours say."
          onClose={() => { if (!busy) setPicking(false); }}
          footer={
            <VoltButton label="Close this date" busy={busy} busyLabel="Saving…"
              enabled={Boolean(chosenDate) && !busy}
              onPress={() => {
                if (!chosenDate) return;
                void run(async () => {
                  await closeDate(chosenDate, reason);
                  track('coach_day_off_added');
                  setPicking(false);
                });
              }} />
          }
        >
          <Row style={{ flexWrap: 'wrap' }} gap={8}>
            {upcoming.map((day) => {
              const alreadyClosed = closedSet.has(day.date);
              const selected = chosenDate === day.date;
              return (
                <Pressable key={day.date} disabled={alreadyClosed}
                  onPress={() => setChosenDate(day.date)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: alreadyClosed }}
                  accessibilityLabel={alreadyClosed ? `${day.label}, already closed` : day.label}
                  style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1,
                    opacity: alreadyClosed ? 0.4 : 1,
                    borderColor: selected ? c.volt : c.line,
                    backgroundColor: selected ? alpha(c.volt, 0.14) : c.surface }}>
                  <Text style={[t.labelSm, { color: selected ? c.accent : c.txt2 }]}>{day.label}</Text>
                </Pressable>
              );
            })}
          </Row>
          <Field value={reason} onChange={setReason} label="Why, optionally"
            placeholder="Competition, holiday, away" />
        </FormSheet>
      </>}
    </View>
  );
}
