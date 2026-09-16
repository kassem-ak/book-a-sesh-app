import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, VoltButton } from '../components/ui';
import { currentAppUserId, formatCents, formatExpiry } from '../lib/bookings';
import { ensureAppSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { initials } from '../state/models';
import { SCHED_TIMES, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// ---------------------------------------------------------------------------
// Data access
//
// These surfaces used to render invented people. Everything below now comes
// from a real table the signed-in coach is actually allowed to read, and every
// write is selected back — RLS turns a forbidden write into a silent zero-row
// success, and `.single()` turns that into an error instead of a lie on screen.
// The pattern is `lib/bookings.ts`; it lives here rather than in lib/ because
// no other screen consumes it.
// ---------------------------------------------------------------------------

// Exactly the live `appt_kind` / `appt_status` enums — never widen these.
type ApptKind = 'new_booking' | 'change_request';
type ApptStatus = 'pending' | 'approved' | 'declined';

type ApptRequest = {
  id: string;
  kind: ApptKind;
  requested: string | null;
  note: string | null;
  status: ApptStatus;
  clientName: string;
};

type ClientPack = {
  id: string;
  clientName: string;
  label: string;
  used: number;
  total: number;
  expiresOn: string | null;
};

type Trainee = { id: string; name: string; stars: number | null };

type CoachPackage = { id: string; sessions: number; priceCents: number };

type CoachPromo = { id: string; code: string; pct: number; createdAt: string };

// PostgREST returns an embedded to-one relation as an object or a single-element
// array depending on the join; normalise once.
function firstRelated<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

function personName(value: { name?: string | null } | { name?: string | null }[] | null | undefined) {
  return firstRelated(value)?.name ?? 'Deleted account';
}

const APPT_KIND_LABEL: Record<ApptKind, string> = {
  new_booking: 'New booking',
  change_request: 'Change request',
};

const APPT_STATUS_LABEL: Record<ApptStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
};

async function fetchApptRequests(): Promise<ApptRequest[]> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase
    .from('appointment_requests')
    .select('id, kind, requested, note, status, created_at, client:users!appointment_requests_client_id_fkey(name)')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    requested: row.requested,
    note: row.note,
    status: row.status,
    clientName: personName(row.client),
  }));
}

/**
 * `grant update (status)` plus policy `appt_coach_decide` is the entire write
 * surface a coach has here: status only, own rows only. Nothing else about the
 * request — or about the client's booking — moves as a result.
 */
async function decideApptRequest(id: string, status: Exclude<ApptStatus, 'pending'>): Promise<ApptStatus> {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('appointment_requests')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .single();
  if (error) throw error;
  return (data as { status: ApptStatus }).status;
}

// Policy `bal_party` lets either side read the balance, so filtering on
// coach_id is what makes this "my clients' packs" rather than my own.
async function fetchClientPacks(): Promise<ClientPack[]> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase
    .from('client_package_balances')
    .select('id, label, used, total, expires_on, client:users!client_package_balances_client_id_fkey(name)')
    .eq('coach_id', coachId);
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    clientName: personName(row.client),
    label: row.label ?? 'Session pack',
    used: row.used ?? 0,
    total: row.total ?? 0,
    expiresOn: row.expires_on,
  }));
}

/**
 * You may review only someone you actually trained, so the candidate list is
 * the distinct clients of this coach's completed bookings — not an arbitrary
 * user picker. Existing stars are read back so the UI shows the saved rating.
 */
async function fetchTrainees(): Promise<Trainee[]> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase
    .from('bookings')
    .select('client_id, client:users!bookings_client_id_fkey(name)')
    .eq('coach_id', coachId)
    .eq('status', 'completed');
  if (error) throw error;

  const byId = new Map<string, string>();
  for (const row of (data ?? []) as any[]) {
    if (row.client_id) byId.set(row.client_id, personName(row.client));
  }
  if (byId.size === 0) return [];

  const { data: mine, error: reviewError } = await supabase
    .from('reviews')
    .select('subject_id, stars')
    .eq('author_id', coachId)
    .in('subject_id', [...byId.keys()]);
  if (reviewError) throw reviewError;

  const stars = new Map<string, number>();
  for (const row of (mine ?? []) as { subject_id: string; stars: number }[]) stars.set(row.subject_id, row.stars);

  return [...byId.entries()].map(([id, name]) => ({ id, name, stars: stars.get(id) ?? null }));
}

/**
 * `reviews` is unique on (subject_id, author_id), so this replaces the coach's
 * previous rating. Public read access does not mean partner profiles show it.
 */
async function rateTrainee(traineeId: string, stars: number): Promise<number> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase
    .from('reviews')
    .upsert({ subject_id: traineeId, author_id: coachId, stars }, { onConflict: 'subject_id,author_id' })
    .select('subject_id, stars')
    .single();
  if (error) throw error;
  return (data as { stars: number }).stars;
}

// `coach_availability` keys weekday 0=Mon..6=Sun; DAYS below is in that order
// so the index is the weekday and no lookup table is needed.
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const byTime = (slots: string[]) => [...slots].sort((a, b) => SCHED_TIMES.indexOf(a) - SCHED_TIMES.indexOf(b));

async function fetchAvailability(): Promise<Record<number, string[]>> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase.from('coach_availability').select('weekday, slot').eq('coach_id', coachId);
  if (error) throw error;
  const week: Record<number, string[]> = {};
  for (const row of (data ?? []) as { weekday: number; slot: string }[]) {
    week[row.weekday] = [...(week[row.weekday] ?? []), row.slot];
  }
  for (const key of Object.keys(week)) week[Number(key)] = byTime(week[Number(key)]);
  return week;
}

// The primary key is (coach_id, weekday, slot), so the insert is its own
// duplicate guard — no read-then-write race to worry about.
async function addAvailability(weekday: number, slot: string) {
  const coachId = await currentAppUserId();
  const { error } = await supabase
    .from('coach_availability')
    .insert({ coach_id: coachId, weekday, slot })
    .select('weekday, slot')
    .single();
  if (error) throw error;
}

async function removeAvailability(weekday: number, slots: string[]) {
  const coachId = await currentAppUserId();
  if (slots.length === 0) return;
  const { error } = await supabase
    .from('coach_availability')
    .delete()
    .eq('coach_id', coachId)
    .eq('weekday', weekday)
    .in('slot', slots);
  if (error) throw error;
}

// `packages` is exactly what discovery reads back (lib/queries.ts embeds active
// packages on every coach card), so edits here really do change what a client
// can buy. Only active rows are listed; a delete is a soft retire.
async function fetchMyPackages(): Promise<CoachPackage[]> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase
    .from('packages')
    .select('id, sessions, price_cents')
    .eq('coach_id', coachId)
    .eq('active', true)
    .order('sessions', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({ id: row.id, sessions: row.sessions, priceCents: row.price_cents }));
}

async function savePackage(id: string, sessions: number, priceCents: number) {
  await ensureAppSession();
  const { error } = await supabase
    .from('packages')
    .update({ sessions, price_cents: priceCents })
    .eq('id', id)
    .select('id, sessions, price_cents')
    .single();
  if (error) throw error;
}

async function createPackage(sessions: number, priceCents: number) {
  const coachId = await currentAppUserId();
  const { error } = await supabase
    .from('packages')
    .insert({ coach_id: coachId, sessions, price_cents: priceCents })
    .select('id')
    .single();
  if (error) throw error;
}

// Retiring, not deleting: a past booking references packages(id), so a hard
// delete would either fail or orphan history.
async function retirePackage(id: string) {
  await ensureAppSession();
  const { error } = await supabase.from('packages').update({ active: false }).eq('id', id).select('id').single();
  if (error) throw error;
}

async function fetchMyPromos(): Promise<CoachPromo[]> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase
    .from('coach_promos')
    .select('id, code, pct, created_at')
    .eq('coach_id', coachId)
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({ id: row.id, code: row.code, pct: row.pct, createdAt: row.created_at }));
}

// ponytail: random suffix, uniqueness enforced by the (coach_id, code) index —
// a collision surfaces as a save error, which is honest. Server-side generation
// if codes ever need to be guess-proof.
function promoSuffix() {
  return Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
}

async function createCoachPromo(pct: number): Promise<CoachPromo> {
  const coachId = await currentAppUserId();
  const { data, error } = await supabase
    .from('coach_promos')
    .insert({ coach_id: coachId, code: `${pct}OFF-${promoSuffix()}`, pct })
    .select('id, code, pct, created_at')
    .single();
  if (error) throw error;
  const row = data as any;
  return { id: row.id, code: row.code, pct: row.pct, createdAt: row.created_at };
}

async function retireCoachPromo(id: string) {
  await ensureAppSession();
  const { error } = await supabase.from('coach_promos').update({ active: false }).eq('id', id).select('id').single();
  if (error) throw error;
}

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

// ---------------------------------------------------------------------------
// Appointment requests
// ---------------------------------------------------------------------------

export function CoachRequestsOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [requests, setRequests] = useState<ApptRequest[]>([]);
  const [packs, setPacks] = useState<ClientPack[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqs, balances, rateable] = await Promise.all([
        fetchApptRequests(),
        fetchClientPacks(),
        fetchTrainees(),
      ]);
      setRequests(reqs);
      setPacks(balances);
      setTrainees(rateable);
    } catch (e) {
      setRequests([]);
      setPacks([]);
      setTrainees([]);
      setError(errorText(e, 'Could not load your requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // The router unmounts the overlay when it closes, so one load on mount is the
  // whole lifecycle; every write below re-runs it.
  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, status: Exclude<ApptStatus, 'pending'>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await decideApptRequest(id, status);
      await load();
    } catch (e) {
      setActionError(errorText(e, 'Could not save that decision.'));
    } finally {
      setBusyId(null);
    }
  };

  const rate = async (trainee: Trainee, stars: number) => {
    setBusyId(trainee.id);
    setActionError(null);
    try {
      const saved = await rateTrainee(trainee.id, stars);
      setTrainees((list) => list.map((x) => (x.id === trainee.id ? { ...x, stars: saved } : x)));
    } catch (e) {
      setActionError(errorText(e, 'Could not save that rating.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="Appointment requests" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {loading && <Note>Loading your requests…</Note>}
        {!loading && error && <ErrorNote message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            {actionError && <Text style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>{actionError}</Text>}

            <View style={{ gap: 11 }}>
              {requests.length === 0 ? (
                <Note>No appointment requests right now.</Note>
              ) : (
                requests.map((a) => (
                  <Card key={a.id} style={{ padding: 14 }}>
                    <Row gap={11}>
                      <Avatar initials={initials(a.clientName)} size={40} radius={12} fontSize={14} />
                      <View style={{ flex: 1 }}>
                        <Text style={[t.name, { color: c.txt }]}>{a.clientName}</Text>
                        <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>
                          {a.requested ?? 'No time given'}
                        </Text>
                      </View>
                      <MicroBadge label={APPT_KIND_LABEL[a.kind]} bg={alpha(c.amber, 0.14)} fg={c.amberText} />
                    </Row>
                    {a.note ? (
                      <Text style={[t.caption, { color: c.txt3, marginTop: 10 }]}>{a.note}</Text>
                    ) : null}
                    <View style={{ marginTop: 12 }}>
                      {a.status !== 'pending' ? (
                        <View
                          style={{
                            borderRadius: 11,
                            backgroundColor: c.surface2,
                            paddingVertical: 10,
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={[
                              t.labelSm,
                              {
                                fontFamily: t.microBadge.fontFamily,
                                color: a.status === 'approved' ? c.accent : c.danger,
                              },
                            ]}
                          >
                            {APPT_STATUS_LABEL[a.status]}
                          </Text>
                        </View>
                      ) : (
                        <Row gap={8}>
                          <ApptBtn
                            label={busyId === a.id ? 'Saving…' : 'Approve'}
                            bg={c.volt}
                            fg={c.ink}
                            accessibilityLabel={`Approve the request from ${a.clientName}`}
                            disabled={busyId === a.id}
                            onPress={() => decide(a.id, 'approved')}
                          />
                          <ApptBtn
                            label="Decline"
                            bg={c.surface2}
                            fg={c.danger}
                            accessibilityLabel={`Decline the request from ${a.clientName}`}
                            disabled={busyId === a.id}
                            onPress={() => decide(a.id, 'declined')}
                          />
                        </Row>
                      )}
                    </View>
                  </Card>
                ))
              )}
            </View>
            {/* A decision is a record on the request row. Nothing reschedules
                or cancels the client's booking as a side effect, so say so. */}
            <Text style={[t.bodySm, { color: c.txt3, marginTop: 12 }]}>
              Approving or declining records your answer on the request. It does not move or cancel the client's
              booking — do that from the session itself.
            </Text>

            <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Client packages</SectionHeading>
            <View style={{ gap: 10 }}>
              {packs.length === 0 ? (
                <Note>No client has an active package with you yet.</Note>
              ) : (
                packs.map((p) => <ClientPackCard key={p.id} pack={p} />)
              )}
            </View>

            <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Rate your trainees</SectionHeading>
            <View style={{ gap: 10 }}>
              {trainees.length === 0 ? (
                <Note>You can rate a trainee once you have completed a session with them.</Note>
              ) : (
                trainees.map((trainee) => (
                  <Card key={trainee.id} style={{ padding: 15 }}>
                    <Row gap={11}>
                      <Avatar initials={initials(trainee.name)} size={40} radius={12} fontSize={14} />
                      <View style={{ flex: 1 }}>
                        <Text style={[t.name, { color: c.txt }]}>{trainee.name}</Text>
                        <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>
                          {trainee.stars
                            ? `You rated ${trainee.stars}/5`
                            : 'Not rated yet'}
                        </Text>
                      </View>
                    </Row>
                    <Row style={{ marginTop: 12, justifyContent: 'center' }} gap={6}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Pressable
                          key={n}
                          onPress={() => rate(trainee, n)}
                          disabled={busyId === trainee.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Rate ${trainee.name} ${n} out of 5`}
                          accessibilityState={{ selected: (trainee.stars ?? 0) >= n, disabled: busyId === trainee.id }}
                        >
                          <Text style={{ fontSize: 30, color: (trainee.stars ?? 0) >= n ? c.amber : c.mono }}>★</Text>
                        </Pressable>
                      ))}
                    </Row>
                  </Card>
                ))
              )}
            </View>
            <Text style={[t.bodySm, { color: c.txt3, marginTop: 14 }]}>
              You can rate only trainees you have completed a session with. A new rating replaces your previous one.
            </Text>
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}

function ClientPackCard({ pack }: { pack: ClientPack }) {
  const { c, t } = useTheme();
  const expiry = formatExpiry(pack.expiresOn);
  // A zero total would divide by zero and, worse, imply a full bar.
  const progress = pack.total > 0 ? Math.min(Math.max(pack.used / pack.total, 0), 1) : 0;
  const left = Math.max(pack.total - pack.used, 0);
  return (
    <Card style={{ paddingHorizontal: 14, paddingVertical: 13 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={11}>
          <Avatar initials={initials(pack.clientName)} size={38} radius={11} fontSize={13} />
          <View>
            <Text style={[t.labelSm, { color: c.txt }]}>
              {pack.clientName} · {pack.label}
            </Text>
            <Text style={[t.caption, { color: c.txt2, marginTop: 1 }]}>
              {pack.used} of {pack.total} used{expiry ? ` · ${expiry}` : ''}
            </Text>
          </View>
        </Row>
        <Text style={[t.priceSm, { color: c.accent }]}>{left} left</Text>
      </Row>
      <View
        style={{ height: 6, borderRadius: 999, backgroundColor: c.surface2, overflow: 'hidden', marginTop: 10 }}
      >
        <View style={{ width: `${progress * 100}%`, height: 6, borderRadius: 999, backgroundColor: c.volt }} />
      </View>
    </Card>
  );
}

function ApptBtn({
  label,
  bg,
  fg,
  accessibilityLabel,
  disabled = false,
  onPress,
}: {
  label: string;
  bg: string;
  fg: string;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        flex: 1,
        borderRadius: 11,
        backgroundColor: bg,
        paddingVertical: 10,
        alignItems: 'center',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: fg }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

export function CoachScheduleOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [week, setWeek] = useState<Record<number, string[]>>({});
  const [weekday, setWeekday] = useState(0);
  const [timeIdx, setTimeIdx] = useState(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWeek(await fetchAvailability());
    } catch (e) {
      setWeek({});
      setError(errorText(e, 'Could not load your schedule.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slots = week[weekday] ?? [];
  const pending = SCHED_TIMES[timeIdx] ?? SCHED_TIMES[0];
  const canAdd = !slots.includes(pending);

  const run = async (write: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await write();
      await load();
    } catch (e) {
      setActionError(errorText(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="My schedule" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {/* Saved straight to coach_availability. It does not retroactively touch
            sessions already on the books, so don't imply that it does. */}
        <Text style={[t.body, { color: c.txt2 }]}>
          Set which slots clients can book, day by day. Each change is saved as you make it; sessions already booked
          are not affected.
        </Text>

        {loading && (
          <View style={{ marginTop: 18 }}>
            <Note>Loading your schedule…</Note>
          </View>
        )}
        {!loading && error && (
          <View style={{ marginTop: 18 }}>
            <ErrorNote message={error} onRetry={load} />
          </View>
        )}

        {!loading && !error && (
          <>
            <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Day</SectionHeading>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {DAYS.map((d, i) => {
                const sel = weekday === i;
                const has = (week[i] ?? []).length > 0;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setWeekday(i)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Edit ${dayNames[i]}`}
                    accessibilityState={{ selected: sel }}
                    style={{
                      alignItems: 'center',
                      borderRadius: 13,
                      backgroundColor: sel ? c.volt : c.surface,
                      borderColor: sel ? c.volt : c.line,
                      borderWidth: 1,
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                    }}
                  >
                    <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: sel ? c.ink : c.txt2 }]}>
                      {d}
                    </Text>
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        marginTop: 4,
                        backgroundColor: !has ? 'transparent' : sel ? c.ink : c.accent,
                      }}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            <Row style={{ marginTop: 22, marginBottom: 11, justifyContent: 'space-between' }}>
              <SectionHeading>Bookable slots</SectionHeading>
              <Pressable
                onPress={() => run(() => removeAvailability(weekday, slots), 'Could not clear that day.')}
                disabled={busy || slots.length === 0}
                accessibilityRole="button"
                accessibilityLabel={`Clear every bookable slot on ${dayNames[weekday]}`}
                accessibilityState={{ disabled: busy || slots.length === 0 }}
              >
                <Text
                  style={[
                    t.caption,
                    { fontFamily: t.labelSm.fontFamily, color: c.danger, opacity: slots.length === 0 ? 0.5 : 1 },
                  ]}
                >
                  Set day off
                </Text>
              </Pressable>
            </Row>

            {actionError && <Text style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>{actionError}</Text>}

            <Row style={{ flexWrap: 'wrap' }} gap={9}>
              {slots.map((slot) => (
                <Row
                  key={slot}
                  style={{
                    borderRadius: 999,
                    backgroundColor: alpha(c.volt, 0.1),
                    borderColor: alpha(c.volt, 0.3),
                    borderWidth: 1,
                    paddingLeft: 15,
                    paddingRight: 8,
                    paddingVertical: 8,
                  }}
                  gap={8}
                >
                  <Text style={[t.labelSm, { color: c.accent }]}>{slot}</Text>
                  <Pressable
                    onPress={() => run(() => removeAvailability(weekday, [slot]), 'Could not remove that slot.')}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${slot} from ${dayNames[weekday]}`}
                    accessibilityState={{ disabled: busy }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: c.surface2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="x" size={11} color={c.txt2} />
                  </Pressable>
                </Row>
              ))}
            </Row>

            <Card style={{ marginTop: 18, padding: 11 }}>
              <Row gap={10}>
                <Stepper
                  icon="minus"
                  label="Earlier slot time"
                  onPress={() => setTimeIdx((i) => Math.max(0, i - 1))}
                />
                <Text style={[t.overlayTitle, { fontSize: 16, color: c.txt, flex: 1, textAlign: 'center' }]}>
                  {pending}
                </Text>
                <Stepper
                  icon="plus"
                  label="Later slot time"
                  onPress={() => setTimeIdx((i) => Math.min(SCHED_TIMES.length - 1, i + 1))}
                />
                <Pressable
                  onPress={() => run(() => addAvailability(weekday, pending), 'Could not add that slot.')}
                  disabled={!canAdd || busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${pending} to ${dayNames[weekday]}`}
                  accessibilityState={{ disabled: !canAdd || busy }}
                  style={{
                    borderRadius: 11,
                    backgroundColor: canAdd && !busy ? c.volt : c.surface2,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: canAdd && !busy ? c.ink : c.txt3 }]}
                  >
                    {canAdd ? 'Add' : 'Added'}
                  </Text>
                </Pressable>
              </Row>
            </Card>

            <Card style={{ marginTop: 16, paddingHorizontal: 14, paddingVertical: 13 }}>
              <Row gap={8}>
                <Icon name="clock" size={15} color={c.accent} />
                <Text style={[t.labelSm, { color: c.strong }]}>
                  {slots.length === 0
                    ? `${dayNames[weekday]} is a day off`
                    : `${slots.length} slot${slots.length > 1 ? 's' : ''} bookable on ${dayNames[weekday]}s`}
                </Text>
              </Row>
            </Card>
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}

// ---------------------------------------------------------------------------
// Packages & promos
// ---------------------------------------------------------------------------

export function CoachPackagesOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [packages, setPackages] = useState<CoachPackage[]>([]);
  const [promos, setPromos] = useState<CoachPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newSessions, setNewSessions] = useState(10);
  const [newPriceCents, setNewPriceCents] = useState(38000);
  const [promoPct, setPromoPct] = useState(15);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pkgs, codes] = await Promise.all([fetchMyPackages(), fetchMyPromos()]);
      setPackages(pkgs);
      setPromos(codes);
    } catch (e) {
      setPackages([]);
      setPromos([]);
      setError(errorText(e, 'Could not load your packages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (write: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await write();
      await load();
    } catch (e) {
      setActionError(errorText(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  // ponytail: each stepper tap writes immediately and reloads — last write
  // wins if someone hammers it. A dirty-then-save button if that ever bites.
  const bumpPackage = (p: CoachPackage, dSessions: number, dPriceCents: number) => {
    const sessions = Math.max(1, p.sessions + dSessions);
    const priceCents = Math.max(0, p.priceCents + dPriceCents);
    if (sessions === p.sessions && priceCents === p.priceCents) return;
    void run(() => savePackage(p.id, sessions, priceCents), 'Could not save that package.');
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="Packages & promos" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {loading && <Note>Loading your packages…</Note>}
        {!loading && error && <ErrorNote message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <SectionHeading style={{ marginBottom: 11 }}>Your packages</SectionHeading>
            {actionError && <Text style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>{actionError}</Text>}
            <View style={{ gap: 11 }}>
              {packages.length === 0 ? (
                <Note>You have no packages on sale yet. Add one below.</Note>
              ) : (
                packages.map((p) => (
                  <Card key={p.id} style={{ padding: 15 }}>
                    <Row style={{ alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[t.name, { color: c.txt }]}>
                          {p.sessions === 1 ? 'Single session' : `${p.sessions}-session pack`}
                        </Text>
                        <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>
                          {formatCents(Math.round(p.priceCents / p.sessions))} per session
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => run(() => retirePackage(p.id), 'Could not remove that package.')}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`Stop selling the ${p.sessions}-session package`}
                        accessibilityState={{ disabled: busy }}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: c.surface2,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name="x" size={12} color={c.txt2} />
                      </Pressable>
                    </Row>
                    <Row style={{ marginTop: 13 }} gap={10}>
                      <PkgStepper
                        value={`${p.sessions}`}
                        unit="sessions"
                        name={`the ${p.sessions}-session package`}
                        disabled={busy}
                        onMinus={() => bumpPackage(p, -1, 0)}
                        onPlus={() => bumpPackage(p, 1, 0)}
                      />
                      <PkgStepper
                        value={formatCents(p.priceCents)}
                        unit="total price"
                        name={`the price of the ${p.sessions}-session package`}
                        accent
                        disabled={busy}
                        onMinus={() => bumpPackage(p, 0, -500)}
                        onPlus={() => bumpPackage(p, 0, 500)}
                      />
                    </Row>
                  </Card>
                ))
              )}
            </View>

            <View
              style={{
                marginTop: 18,
                borderRadius: 16,
                borderColor: c.line,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                padding: 15,
              }}
            >
              <Text style={[t.labelSm, { color: c.txt2 }]}>
                New package — {newSessions === 1 ? 'Single session' : `${newSessions}-session pack`}
              </Text>
              <Row style={{ marginTop: 12 }} gap={10}>
                <PkgStepper
                  value={`${newSessions}`}
                  unit="sessions"
                  name="the new package"
                  disabled={busy}
                  onMinus={() => setNewSessions((n) => Math.max(1, n - 1))}
                  onPlus={() => setNewSessions((n) => n + 1)}
                />
                <PkgStepper
                  value={formatCents(newPriceCents)}
                  unit="total price"
                  name="the price of the new package"
                  accent
                  disabled={busy}
                  onMinus={() => setNewPriceCents((v) => Math.max(500, v - 500))}
                  onPlus={() => setNewPriceCents((v) => v + 500)}
                />
              </Row>
              <View style={{ marginTop: 12 }}>
                <VoltButton
                  label="Add package"
                  height={44}
                  enabled={!busy}
                  busy={busy}
                  busyLabel="Saving…"
                  onPress={() => run(() => createPackage(newSessions, newPriceCents), 'Could not add that package.')}
                />
              </View>
            </View>
            <Text style={[t.bodySm, { color: c.txt3, marginTop: 12 }]}>
              Packages are live on your public profile — clients book from exactly this list.
            </Text>

            <SectionHeading style={{ marginTop: 26, marginBottom: 11 }}>Create a promo</SectionHeading>
            <Row gap={8}>
              {[10, 15, 20, 25].map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPromoPct(p)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${p} percent off`}
                  accessibilityState={{ selected: promoPct === p }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    borderRadius: 13,
                    backgroundColor: promoPct === p ? c.volt : c.surface,
                    borderColor: promoPct === p ? c.volt : c.line,
                    borderWidth: 1,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={[t.price, { color: promoPct === p ? c.ink : c.txt2 }]}>{p}%</Text>
                </Pressable>
              ))}
            </Row>
            <View style={{ marginTop: 12 }}>
              <VoltButton
                label="Generate my promo code"
                enabled={!busy}
                busy={busy}
                busyLabel="Saving…"
                onPress={() =>
                  run(async () => {
                    await createCoachPromo(promoPct);
                  }, 'Could not create that promo code.')
                }
              />
            </View>

            <SectionHeading style={{ marginTop: 24, marginBottom: 11 }}>Your active promos</SectionHeading>
            <View style={{ gap: 10 }}>
              {promos.length === 0 ? (
                <Note>No active promos.</Note>
              ) : (
                promos.map((promo) => (
                  <PromoCard
                    key={promo.id}
                    code={promo.code}
                    sub={`${promo.pct}% off your sessions`}
                    onRemove={() => run(() => retireCoachPromo(promo.id), 'Could not remove that promo.')}
                    removeLabel={`Deactivate promo code ${promo.code}`}
                    disabled={busy}
                  />
                ))
              )}
            </View>
            {/* Nothing in the app redeems coach_promos at checkout yet. Saying
                the code "works" would be the exact lie this pass removes. */}
            <Text style={[t.bodySm, { color: c.txt3, marginTop: 16 }]}>
              Promo codes are saved to your profile, but checkout does not redeem them yet — share one only once
              BOOK'D turns redemption on. Platform-wide promotions are managed by BOOK'D admins.
            </Text>
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Stepper({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={14} color={c.txt2} />
    </Pressable>
  );
}

function PkgStepper({
  value,
  unit,
  name,
  accent,
  disabled = false,
  onMinus,
  onPlus,
}: {
  value: string;
  unit: string;
  name: string;
  accent?: boolean;
  disabled?: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const { c, t } = useTheme();
  const box = {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: c.bg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <Row style={{ flex: 1, borderRadius: 12, backgroundColor: c.surface2, paddingHorizontal: 8, paddingVertical: 7 }} gap={0}>
      <Pressable
        onPress={disabled ? undefined : onMinus}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${unit} for ${name}`}
        accessibilityState={{ disabled }}
        style={box}
      >
        <Icon name="minus" size={12} color={c.txt2} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[t.priceSm, { color: accent ? c.accent : c.txt }]}>{value}</Text>
        <Text style={[t.caption, { fontSize: 10, color: c.txt3 }]}>{unit}</Text>
      </View>
      <Pressable
        onPress={disabled ? undefined : onPlus}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${unit} for ${name}`}
        accessibilityState={{ disabled }}
        style={box}
      >
        <Icon name="plus" size={12} color={c.txt2} />
      </Pressable>
    </Row>
  );
}

function PromoCard({
  code,
  sub,
  onRemove,
  removeLabel,
  disabled = false,
}: {
  code: string;
  sub: string;
  onRemove: () => void;
  removeLabel: string;
  disabled?: boolean;
}) {
  const { c, t } = useTheme();
  return (
    <Card>
      <Row style={{ paddingHorizontal: 14, paddingVertical: 13 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: 15, letterSpacing: 0.5, color: c.accent }}>
            {code}
          </Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{sub}</Text>
        </View>
        <Pressable
          onPress={disabled ? undefined : onRemove}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
          accessibilityState={{ disabled }}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: c.surface2,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Icon name="x" size={12} color={c.txt2} />
        </Pressable>
      </Row>
    </Card>
  );
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
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try loading again">
          <Text style={[t.caption, { fontFamily: t.labelSm.fontFamily, color: c.txt2 }]}>Try again</Text>
        </Pressable>
      </Row>
    </Card>
  );
}
