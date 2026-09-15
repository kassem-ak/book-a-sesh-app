import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, MicroBadge, Row, SectionHeading } from '../components/ui';
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
function todayBounds() {
  const start = new Date();
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

async function fetchToday(): Promise<DaySession[]> {
  const coachId = await currentAppUserId();
  const { start, end } = todayBounds();
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
  const [sessions, setSessions] = useState<DaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await fetchToday());
    } catch (e) {
      setSessions([]);
      setError(e instanceof Error ? e.message : 'Could not load today’s sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  // The router unmounts the overlay when it closes, so one load on mount is the
  // whole lifecycle; the write below re-runs it.
  useEffect(() => {
    void load();
  }, [load]);

  const complete = async (session: DaySession) => {
    setBusyId(session.id);
    setActionError(null);
    try {
      await markCompleted(session.id);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not close out that session.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="My day" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Today</SectionHeading>

        {loading && <Note>Loading today’s sessions…</Note>}
        {!loading && error && <ErrorNote message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            {actionError && <Text style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>{actionError}</Text>}
            <View style={{ gap: 10 }}>
              {sessions.length === 0 ? (
                <Note>Nothing booked with you today.</Note>
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
                        <Pressable
                          onPress={() => complete(session)}
                          disabled={busyId === session.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Mark the session with ${session.clientName} as completed`}
                          accessibilityState={{ disabled: busyId === session.id }}
                          style={{
                            marginTop: 12,
                            borderRadius: 11,
                            backgroundColor: c.volt,
                            paddingVertical: 10,
                            alignItems: 'center',
                            opacity: busyId === session.id ? 0.6 : 1,
                          }}
                        >
                          <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: c.ink }]}>
                            {busyId === session.id ? 'Saving…' : 'Mark done'}
                          </Text>
                        </Pressable>
                      )}
                    </Card>
                  );
                })
              )}
            </View>
          </>
        )}
      </View>
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

function Note({ children }: { children: ReactNode }) {
  const { c, t } = useTheme();
  return (
    <Card style={{ padding: 16 }}>
      <Text style={[t.bodySm, { color: c.txt2 }]}>{children}</Text>
    </Card>
  );
}

function ErrorNote({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card style={{ padding: 16 }} background={alpha(c.danger, 0.05)} borderColor={alpha(c.danger, 0.28)}>
      <Text style={[t.bodySm, { color: c.danger }]}>{message}</Text>
      <Row style={{ marginTop: 12 }}>
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try loading today’s sessions again">
          <Text style={[t.caption, { fontFamily: t.labelSm.fontFamily, color: c.txt2 }]}>Try again</Text>
        </Pressable>
      </Row>
    </Card>
  );
}
