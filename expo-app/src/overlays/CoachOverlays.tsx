import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { analyticsErrorCode, track } from '../lib/analytics';
import { Pressable, Text, TextInput, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import {
  Avatar, Button, Card, ErrorNote, Icon, MicroBadge, Note, Row, SectionHeading, VoltButton,
} from '../components/ui';
import { currentAppUserId, formatCents, formatExpiry } from '../lib/bookings';
import {
  addPromo, CoachPricing, fetchMyPricing, money, parseMoney, removePackage, removePromo,
  savePackage, SessionPackage, setSessionRate,
} from '../lib/pricing';
import {
  decideCancellation, fetchCancellations, fetchClientPackages, PackageCancellation,
  PackageProgress, progressSummary, suggestedRefundCents,
} from '../lib/packages';
import { RefundNegotiation } from '../components/RefundNegotiation';
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

// ponytail: random suffix, uniqueness enforced by the (coach_id, code) index —
// a collision surfaces as a save error, which is honest. Server-side generation
// if codes ever need to be guess-proof.
function promoSuffix() {
  return Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
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
      track('write_failed', { error_code: analyticsErrorCode(e) });
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
      track('write_failed', { error_code: analyticsErrorCode(e) });
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
              Approving or declining only records your answer on the request. It does not change the client's
              booking. This screen cannot reschedule or cancel sessions.
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


// ---------------------------------------------------------------------------
// Packages & promos
// ---------------------------------------------------------------------------

export function CoachPackagesOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [pricing, setPricing] = useState<CoachPricing | null>(null);
  // What each client has left of a pack they bought. The same view the client
  // reads, from the other side -- so the two cannot show different numbers.
  const [clients, setClients] = useState<PackageProgress[]>([]);
  // Open cancellation requests, keyed by client+package. The refund box starts
  // at the unused share of what was paid -- the arithmetic the coach would do
  // anyway -- and stays editable, because it is their money and their call.
  const [requests, setRequests] = useState<PackageCancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Everything is typed. Steppers could only reach a price by tapping towards
  // it, which is fine for 5 sessions and absurd for $400 -- and they could not
  // express "$37.50" at all.
  const [rate, setRate] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { sessions: string; price: string }>>({});
  const [newSessions, setNewSessions] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoPct, setPromoPct] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [current, sold, asked] = await Promise.all([
        fetchMyPricing(), fetchClientPackages(), fetchCancellations(),
      ]);
      setPricing(current);
      setClients(sold);
      // 'offered' is still open -- the figure is being argued over.
      setRequests(asked.filter(
        (request) => request.status === 'requested' || request.status === 'offered',
      ));
      setRate(current.rateCents ? money(current.rateCents) : '');
      setDrafts({});
    } catch (e) {
      setPricing(null);
      setClients([]);
      setRequests([]);
      setError(errorText(e, 'Could not load your packages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Every write re-reads. A price list showing a figure the server refused is
  // the one thing it must never do.
  const run = async (write: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await write();
      await load();
      s.set('profileRevision', s.profileRevision + 1);
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setActionError(errorText(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  const draftFor = (pkg: SessionPackage) =>
    drafts[pkg.id] ?? { sessions: String(pkg.sessions), price: money(pkg.priceCents) };
  const setDraft = (id: string, change: Partial<{ sessions: string; price: string }>) =>
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { sessions: '', price: '' }), ...change } as { sessions: string; price: string },
    }));

  const saveRate = () => {
    const cents = parseMoney(rate);
    if (cents === null) { setActionError('Enter a rate like 45 or 45.50.'); return; }
    void run(async () => {
      await setSessionRate(cents);
      track('coach_rate_set');
    }, 'Could not save your rate.');
  };

  const savePkg = (pkg: SessionPackage) => {
    const draft = draftFor(pkg);
    const sessions = Number(draft.sessions.replace(/[^0-9]/g, ''));
    const cents = parseMoney(draft.price);
    if (cents === null) { setActionError('Enter a package price like 400 or 399.99.'); return; }
    void run(() => savePackage({ id: pkg.id, sessions, priceCents: cents, active: pkg.active }),
      'Could not save that package.');
  };

  const addPackage = () => {
    const sessions = Number(newSessions.replace(/[^0-9]/g, ''));
    const cents = parseMoney(newPrice);
    if (cents === null) { setActionError('Enter a package price like 400 or 399.99.'); return; }
    void run(async () => {
      await savePackage({ sessions, priceCents: cents });
      track('coach_package_added');
      setNewSessions(''); setNewPrice('');
    }, 'Could not add that package.');
  };

  const addCode = () => {
    const pct = Number(promoPct.replace(/[^0-9]/g, ''));
    void run(async () => {
      await addPromo(promoCode, pct);
      track('coach_promo_added');
      setPromoCode(''); setPromoPct('');
    }, 'Could not create that promo code.');
  };

  // What a new package works out at per session, shown while it is being typed
  // -- the reason to sell a block is that it is cheaper, and the coach should
  // see that before they save rather than after.
  const perSession = (sessionsText: string, priceText: string) => {
    const sessions = Number(sessionsText.replace(/[^0-9]/g, ''));
    const cents = parseMoney(priceText);
    if (!sessions || cents === null) return null;
    return money(Math.round(cents / sessions));
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="Packages, pricing & promos" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {loading && <Note>Loading your packages…</Note>}
        {!loading && error && <ErrorNote message={error} onRetry={load} />}

        {!loading && !error && pricing && (
          <>
            {actionError && <Text style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>{actionError}</Text>}

            <SectionHeading style={{ marginBottom: 11 }}>Your rate</SectionHeading>
            <Text style={[t.bodySm, { color: c.txt2, marginBottom: 11 }]}>
              What one session with you costs. This is the price people see in Discover and on the Book button.
            </Text>
            <Row gap={10} style={{ alignItems: 'center' }}>
              <Text style={[t.price, { color: c.accent }]}>$</Text>
              <View style={{ flex: 1 }}>
                <MoneyField value={rate} onChange={setRate} label="Price per session" placeholder="45" />
              </View>
              <Button label="Save" icon="check" enabled={!busy} onPress={saveRate}
                accessibilityLabel="Save your rate per session" />
            </Row>
            <Text style={[t.bodySm, { color: c.txt3, marginTop: 8 }]}>
              Leave it at 0 and BOOK’D quotes nothing rather than guessing a figure for you.
            </Text>

            <SectionHeading style={{ marginTop: 26, marginBottom: 11 }}>Your packages</SectionHeading>
            <View style={{ gap: 11 }}>
              {pricing.packages.length === 0 ? (
                <Note>You have no packages on sale yet. Add one below.</Note>
              ) : (
                pricing.packages.map((pkg) => {
                  const draft = draftFor(pkg);
                  const dirty = draft.sessions !== String(pkg.sessions) || draft.price !== money(pkg.priceCents);
                  const each = perSession(draft.sessions, draft.price);
                  return (
                    <Card key={pkg.id} style={{ padding: 15, gap: 10 }}>
                      <Row style={{ alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[t.name, { color: c.txt }]}>
                            {pkg.sessions === 1 ? 'Single session' : `${pkg.sessions}-session pack`}
                          </Text>
                          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>
                            {each ? `$${each} per session` : 'Enter a number of sessions and a price'}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => run(() => removePackage(pkg.id), 'Could not remove that package.')}
                          disabled={busy} accessibilityRole="button"
                          accessibilityLabel={`Remove the ${pkg.sessions}-session package`}
                          accessibilityState={{ disabled: busy }}
                          style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.surface2,
                            alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="x" size={14} color={c.txt2} />
                        </Pressable>
                      </Row>
                      <Row gap={10} style={{ alignItems: 'center' }}>
                        <View style={{ width: 96 }}>
                          <MoneyField value={draft.sessions} onChange={(sessions) => setDraft(pkg.id, { sessions })}
                            label={`Sessions in the ${pkg.sessions}-session package`} placeholder="10" />
                        </View>
                        <Text style={[t.bodySm, { color: c.txt3 }]}>sessions</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={[t.price, { color: c.accent }]}>$</Text>
                        <View style={{ width: 110 }}>
                          <MoneyField value={draft.price} onChange={(price) => setDraft(pkg.id, { price })}
                            label={`Total price of the ${pkg.sessions}-session package`} placeholder="400" />
                        </View>
                      </Row>
                      {dirty && (
                        <Row gap={12}>
                          <View style={{ flex: 1 }}>
                            <VoltButton label="Save package" busy={busy} busyLabel="Saving…"
                              enabled={!busy} onPress={() => savePkg(pkg)} />
                          </View>
                          <Button label="Undo" icon="rotate-ccw" enabled={!busy}
                            accessibilityLabel="Discard these changes"
                            onPress={() => setDrafts((current) => {
                              const next = { ...current };
                              delete next[pkg.id];
                              return next;
                            })} />
                        </Row>
                      )}
                    </Card>
                  );
                })
              )}

              <Card style={{ padding: 15, gap: 10, borderStyle: 'dashed' }}>
                <Text style={[t.labelSm, { color: c.txt2 }]}>New package</Text>
                <Row gap={10} style={{ alignItems: 'center' }}>
                  <View style={{ width: 96 }}>
                    <MoneyField value={newSessions} onChange={setNewSessions}
                      label="Sessions in the new package" placeholder="10" />
                  </View>
                  <Text style={[t.bodySm, { color: c.txt3 }]}>sessions</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[t.price, { color: c.accent }]}>$</Text>
                  <View style={{ width: 110 }}>
                    <MoneyField value={newPrice} onChange={setNewPrice}
                      label="Total price of the new package" placeholder="400" />
                  </View>
                </Row>
                {perSession(newSessions, newPrice) && (
                  <Text style={[t.bodySm, { color: c.txt2 }]}>
                    ${perSession(newSessions, newPrice)} per session
                  </Text>
                )}
                <VoltButton label="Add package" busy={busy} busyLabel="Saving…"
                  enabled={newSessions.trim() !== '' && newPrice.trim() !== '' && !busy}
                  onPress={addPackage} />
              </Card>
            </View>
            <Text style={[t.bodySm, { color: c.txt3, marginTop: 12 }]}>
              Packages are live on your public profile — clients book from exactly this list. A package is two or more
              sessions; a single session uses your rate above.
            </Text>

            <SectionHeading style={{ marginTop: 26, marginBottom: 11 }}>Packs your clients are on</SectionHeading>
            <Text style={[t.bodySm, { color: c.txt3, marginBottom: 11 }]}>
              What each client has booked, is waiting on, has already had, and still has left. They see the same numbers.
            </Text>
            <View style={{ gap: 10 }}>
              {clients.length === 0 ? (
                <Note>Nobody is part-way through a pack right now.</Note>
              ) : (
                clients.map((pack) => (
                  (() => {
                    const key = pack.clientId + pack.packageId;
                    const request = requests.find(
                      (r) => r.clientId === pack.clientId && r.packageId === pack.packageId,
                    );
                    const sold = pricing?.packages.find((p) => p.id === pack.packageId);
                    const suggested = sold ? suggestedRefundCents(pack, sold.priceCents) : 0;
                    return (
                      <Card key={key} style={{ padding: 14, gap: 10 }}>
                        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[t.name, { color: c.txt }]}>{pack.withName}</Text>
                            <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>
                              {pack.total}-session pack · {progressSummary(pack)}
                            </Text>
                          </View>
                          <Text style={[t.priceSm, { color: c.accent }]}>{pack.remaining} left</Text>
                        </Row>

                        {request && (
                          <View style={{ gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
                            <Text style={[t.labelSm, { color: c.danger }]}>
                              {pack.withName.split(' ')[0]} asked to cancel this pack
                            </Text>
                            {request.reason ? (
                              <Text style={[t.bodySm, { color: c.txt2 }]}>“{request.reason}”</Text>
                            ) : null}
                            {/* The same panel the client sees, from the
                                other side. Two implementations of "what is on
                                the table" would be two places for the figures
                                to be presented differently. */}
                            <RefundNegotiation request={request}
                              suggestedCents={suggested}
                              onSettled={load} />
                            <Button label="Decline the cancellation" icon="x" tone="danger" enabled={!busy}
                              accessibilityLabel={`Decline the cancellation from ${pack.withName}`}
                              onPress={() => run(
                                () => decideCancellation(request.id, 'rejected'),
                                'Could not decline that request.',
                              )} />
                          </View>
                        )}
                      </Card>
                    );
                  })()
                ))
              )}
            </View>

            <SectionHeading style={{ marginTop: 26, marginBottom: 11 }}>Promo codes</SectionHeading>
            {/* Promo codes persist, but no booking flow redeems them yet. */}
            <Text style={[t.bodySm, { color: c.txt3, marginBottom: 11 }]}>
              Write your own code and the discount it carries. Codes are recorded in your promo list; they are not yet
              redeemable in the app and do not change booking prices.
            </Text>
            <Row gap={10} style={{ alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <MoneyField value={promoCode} onChange={setPromoCode} label="Promo code" placeholder="SUMMER20" />
              </View>
              <View style={{ width: 84 }}>
                <MoneyField value={promoPct} onChange={setPromoPct} label="Percentage off" placeholder="20" />
              </View>
              <Text style={[t.price, { color: c.accent }]}>%</Text>
            </Row>
            <View style={{ marginTop: 12 }}>
              <VoltButton label="Add promo code" enabled={promoCode.trim().length > 2 && promoPct.trim() !== '' && !busy}
                busy={busy} busyLabel="Saving…" onPress={addCode} />
            </View>

            <SectionHeading style={{ marginTop: 24, marginBottom: 11 }}>Your promo codes</SectionHeading>
            <View style={{ gap: 10 }}>
              {pricing.promos.length === 0 ? (
                <Note>No promo codes to show.</Note>
              ) : (
                pricing.promos.map((promo) => (
                  <PromoCard
                    key={promo.id}
                    code={promo.code}
                    sub={`${promo.pct}% recorded · not redeemable in the app`}
                    onRemove={() => run(() => removePromo(promo.id), 'Could not remove that promo.')}
                    removeLabel={`Remove promo code ${promo.code}`}
                    disabled={busy}
                  />
                ))
              )}
            </View>
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

// A plain typed field. `Field` in components/ui is the same shape; this one
// exists because these sit inside rows that size themselves, and it keeps the
// accessible name required without the leading-icon plumbing.
function MoneyField({ value, onChange, label, placeholder }: {
  value: string; onChange: (text: string) => void; label: string; placeholder: string;
}) {
  const { c, t } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.txt3}
      accessibilityLabel={label}
      // decimal-pad rather than number-pad: prices have decimal points, and a
      // promo code needs letters, so that one falls back to the default.
      keyboardType={placeholder === 'SUMMER20' ? 'default' : 'decimal-pad'}
      autoCapitalize={placeholder === 'SUMMER20' ? 'characters' : 'none'}
      style={[t.label, { color: c.txt, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1,
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44 }]}
    />
  );
}

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


