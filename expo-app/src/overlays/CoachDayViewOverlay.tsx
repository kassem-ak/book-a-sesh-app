import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { analyticsErrorCode, track } from '../lib/analytics';
import { Modal, Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import {
  Avatar, Button, Card, ErrorNote, Icon, MicroBadge, Note, Row, SectionHeading,
} from '../components/ui';
import { BookingStatus, bookingStatusLabel, currentAppUserId, formatCents } from '../lib/bookings';
import { ensureAppSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { initials } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// The signed-in coach's own day, read from `bookings` (policy `book_party_read`
// lets either party read the row, so the coach_id filter is what makes it mine).
// It used to render six invented trainees under a demo coach's name.

type DaySession = {
  id: string;
  clientName: string;
  scheduledFor: string;
  slotLabel: string | null;
  status: BookingStatus;
  totalCents: number;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

// Local midnight to local midnight: the coach's day is the one on their clock,
// not UTC's.
function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function timeLabel(session: DaySession) {
  if (session.slotLabel) return session.slotLabel;
  const at = new Date(session.scheduledFor);
  if (Number.isNaN(at.getTime())) return 'Time to be confirmed';
  const hours = at.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(at.getMinutes()).padStart(2, '0')} ${period}`;
}

async function fetchDay(date: Date): Promise<DaySession[]> {
  const coachId = await currentAppUserId();
  const { start, end } = dayBounds(date);
  const { data, error } = await supabase
    .from('bookings')
    // users exposes only the non-sensitive columns; asking for more is refused.
    .select('id, scheduled_for, slot_label, status, total_cents, client:users!bookings_client_id_fkey(name)')
    .eq('coach_id', coachId)
    .gte('scheduled_for', start)
    .lt('scheduled_for', end)
    .order('scheduled_for', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    clientName: firstRelated<{ name?: string | null }>(row.client)?.name ?? 'Deleted account',
    scheduledFor: row.scheduled_for,
    slotLabel: row.slot_label,
    status: row.status,
    totalCents: row.total_cents ?? 0,
  }));
}

/**
 * `guard_booking_status_transition` lets the coach move a booking to
 * confirmed/completed/no_show/cancelled. Selecting the row back is deliberate:
 * RLS turns a forbidden update into a silent zero-row success, and `.single()`
 * turns that into an error rather than a tick over nothing.
 */
async function markCompleted(bookingId: string): Promise<BookingStatus> {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)
    .select('id, status')
    .single();
  if (error) throw error;
  return (data as { status: BookingStatus }).status;
}

// Only a session that has actually started and is still live can be closed out.
const canComplete = (session: DaySession) =>
  (session.status === 'pending' || session.status === 'confirmed') &&
  new Date(session.scheduledFor).getTime() <= Date.now();

export function CoachDayViewOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [sessions, setSessions] = useState<DaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmSession, setConfirmSession] = useState<DaySession | null>(null);
  const loadId = useRef(0);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  const changeWeek = (offset: number) => setSelectedDate((date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset * 7));

  const load = useCallback(async () => {
    const requestId = ++loadId.current;
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const rows = await fetchDay(selectedDate);
      if (requestId === loadId.current) setSessions(rows);
    } catch (e) {
      if (requestId !== loadId.current) return;
      setSessions([]);
      setError(e instanceof Error ? e.message : 'Could not load sessions for this day.');
    } finally {
      if (requestId === loadId.current) setLoading(false);
    }
  }, [selectedDate]);

  // A slower response for the previous day must not replace the selected day.
  useEffect(() => {
    void load();
    return () => { loadId.current += 1; };
  }, [load]);

  const complete = async (session: DaySession) => {
    if (busyId) return;
    setBusyId(session.id);
    setActionError(null);
    try {
      await markCompleted(session.id);
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setActionError(e instanceof Error ? e.message : 'Could not close out that session.');
    } finally {
      setBusyId(null);
      setConfirmSession(null);
    }
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="My day" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <SectionHeading style={{ flex: 1 }}>{isToday ? 'Today' : selectedDate.toDateString()}</SectionHeading>
          <Pressable onPress={() => changeWeek(-1)} accessibilityRole="button" accessibilityLabel="Previous week" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-left" size={20} color={c.txt2} />
          </Pressable>
          <Pressable onPress={() => changeWeek(1)} accessibilityRole="button" accessibilityLabel="Next week" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-right" size={20} color={c.txt2} />
          </Pressable>
        </Row>
        <Row gap={4} style={{ marginBottom: 16 }}>
          {weekDays.map((date) => {
            const selected = date.toDateString() === selectedDate.toDateString();
            return (
              <Pressable
                key={date.toDateString()}
                onPress={() => setSelectedDate(date)}
                accessibilityRole="button"
                accessibilityLabel={`Show sessions for ${date.toDateString()}`}
                accessibilityState={{ selected }}
                style={{ flex: 1, minHeight: 56, borderRadius: 12, backgroundColor: selected ? c.volt : c.surface, alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <Text style={[t.caption, { color: selected ? c.ink : c.txt2 }]}>{date.toDateString().slice(0, 3)}</Text>
                <Text style={[t.labelSm, { color: selected ? c.ink : c.txt }]}>{date.getDate()}</Text>
              </Pressable>
            );
          })}
        </Row>

        {loading && <Note>Loading sessions…</Note>}
        {!loading && error && <ErrorNote message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            {actionError && <Text style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>{actionError}</Text>}
            <View style={{ gap: 10 }}>
              {sessions.length === 0 ? (
                <Note>{isToday ? 'Nothing booked with you today.' : 'Nothing booked with you on this day.'}</Note>
              ) : (
                sessions.map((session) => {
                  const tint = statusTint(session.status, c);
                  return (
                    <Card key={session.id} style={{ padding: 14 }}>
                      <Row gap={11}>
                        <Avatar initials={initials(session.clientName)} size={40} radius={12} fontSize={14} />
                        <View style={{ flex: 1 }}>
                          <Text style={[t.name, { color: c.txt }]}>{session.clientName}</Text>
                          <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>
                            {timeLabel(session)} · {formatCents(session.totalCents)}
                          </Text>
                        </View>
                        <MicroBadge label={bookingStatusLabel(session.status)} bg={tint.bg} fg={tint.fg} />
                      </Row>
                      {canComplete(session) && (
                        <Button
                          label="Mark done"
                          icon="check"
                          tone="primary"
                          height={44}
                          full
                          style={{ marginTop: 12 }}
                          busy={busyId === session.id}
                          busyLabel="Saving…"
                          enabled={busyId !== session.id}
                          accessibilityLabel={`Mark the session with ${session.clientName} as completed`}
                          onPress={() => setConfirmSession(session)}
                        />
                      )}
                    </Card>
                  );
                })
              )}
            </View>
          </>
        )}
      </View>
      <Modal transparent visible={confirmSession !== null} animationType="fade" onRequestClose={() => { if (!busyId) setConfirmSession(null); }}>
        <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: c.scrim, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          {confirmSession && (
            <Card style={{ width: '100%', maxWidth: 360, padding: 22 }}>
              <Text accessibilityRole="header" style={[t.overlayTitle, { color: c.txt, marginBottom: 10 }]}>
                Mark this session done?
              </Text>
              <Text style={[t.bodyLg, { color: c.txt2 }]}>
                The {timeLabel(confirmSession)} session with {confirmSession.clientName} is recorded as
                completed, and it comes off their package.
              </Text>
              <Row gap={12} style={{ marginTop: 22 }}>
                <Button label="Not yet" icon="x" style={{ flex: 1 }}
                  enabled={busyId === null}
                  accessibilityLabel="No, keep this session unchanged"
                  onPress={() => setConfirmSession(null)} />
                <Button label="Mark done" icon="check" tone="primary" height={44}
                  style={{ flex: 1 }}
                  busy={busyId !== null} busyLabel="Saving…"
                  enabled={busyId === null}
                  accessibilityLabel={`Mark the ${timeLabel(confirmSession)} session with ${confirmSession.clientName} as completed`}
                  onPress={() => complete(confirmSession)} />
              </Row>
            </Card>
          )}
        </View>
      </Modal>
    </OverlayScaffold>
  );
}

// Same tokens the rest of the app uses: live = volt, waiting = amber, ended
// badly = danger, done = neutral.
function statusTint(status: BookingStatus, c: ReturnType<typeof useTheme>['c']) {
  if (status === 'confirmed') return { bg: alpha(c.volt, 0.14), fg: c.accent };
  if (status === 'pending') return { bg: alpha(c.amber, 0.18), fg: c.amberText };
  if (status === 'cancelled' || status === 'no_show') return { bg: alpha(c.danger, 0.12), fg: c.danger };
  return { bg: c.surface2, fg: c.txt2 };
}


