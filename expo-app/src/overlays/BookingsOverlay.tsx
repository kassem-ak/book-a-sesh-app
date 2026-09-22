import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { analyticsErrorCode, track } from '../lib/analytics';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import {
  Avatar, Button, ButtonTone, Card, ErrorNote, Field, FormSheet, Icon, IconName, MicroBadge,
  Note, Row, SectionHeading, Segmented, VoltButton,
} from '../components/ui';
import { RefundNegotiation } from '../components/RefundNegotiation';
import {
  BookingStatus,
  MyBooking,
  MyBookings,
  PackageBalance,
  SessionKind,
  acceptSession,
  bookingStatusLabel,
  canCancel,
  cancelSession,
  fetchMyBookings,
  fetchMyPackageBalances,
  formatCents,
  formatExpiry,
  formatSessionWhen,
} from '../lib/bookings';
import { dateKey as dayKey, monthCells, MONTH_NAMES } from '../lib/calendarGrid';
import {
  fetchCancellations, fetchMyPackages, fetchPackagePrices, PackageCancellation, PackageProgress,
  progressSummary, requestCancellation, suggestedRefundCents, withdrawCancellation,
} from '../lib/packages';
import { initials } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

const EMPTY: MyBookings = { upcoming: [], past: [] };

export function BookingsOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [bookings, setBookings] = useState<MyBookings>(EMPTY);
  const [packages, setPackages] = useState<PackageBalance[]>([]);
  // Counted from the bookings rather than a stored counter, so a cancelled
  // session comes back to the pack instead of being lost.
  const [progress, setProgress] = useState<PackageProgress[]>([]);
  // Cancellation requests, keyed by package. A pack has at most one open
  // request -- the database has a partial unique index saying so.
  const [cancels, setCancels] = useState<Map<string, PackageCancellation>>(new Map());
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [asking, setAsking] = useState<PackageProgress | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Cancelling is destructive and RN Web has no Alert, so the card asks for a
  // second tap in place instead of opening a dialog.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mine, balances, packs, requests] = await Promise.all([
        fetchMyBookings(), fetchMyPackageBalances(), fetchMyPackages(), fetchCancellations(),
      ]);
      setBookings(mine);
      setPackages(balances);
      setProgress(packs);
      // Newest first from the server, so the first row for a pack is the
      // current one and anything older is history.
      const latest = new Map<string, PackageCancellation>();
      for (const request of requests) {
        if (!latest.has(request.packageId)) latest.set(request.packageId, request);
      }
      setCancels(latest);
      // Second round trip because the price is only needed once the packs are
      // known. A failure here leaves the refund box empty rather than wrong,
      // which is the better of the two.
      try {
        setPrices(await fetchPackagePrices(packs.map((pack) => pack.packageId)));
      } catch {
        setPrices(new Map());
      }
    } catch (e) {
      setBookings(EMPTY);
      setPackages([]);
      setProgress([]);
      setCancels(new Map());
      setPrices(new Map());
      setError(e instanceof Error ? e.message : 'Could not load your bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  // The overlay is unmounted by the router when it closes, so a single load on
  // mount is the whole lifecycle; every write below re-runs it.
  useEffect(() => {
    void load();
  }, [load]);

  const onAccept = async (booking: MyBooking) => {
    setCancellingId(booking.id);
    setActionError(null);
    try {
      await acceptSession(booking);
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setActionError(e instanceof Error ? e.message : 'Could not accept that session.');
    } finally {
      setCancellingId(null);
    }
  };

  // Write, then re-read. A package that shows a state the server refused is
  // worse than one that is briefly a beat behind.
  const run = async (write: () => Promise<void>, fallback: string) => {
    setActionError(null);
    try {
      await write();
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setActionError(e instanceof Error ? e.message : fallback);
    }
  };

  const onCancel = async (booking: MyBooking) => {
    setCancellingId(booking.id);
    setActionError(null);
    try {
      await cancelSession(booking);
      setConfirmingId(null);
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setActionError(e instanceof Error ? e.message : 'Could not cancel that session.');
    } finally {
      setCancellingId(null);
    }
  };

  const hasSessions = bookings.upcoming.length > 0 || bookings.past.length > 0;

  return (
    <OverlayScaffold header={<OverlayHeader title="My bookings" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {loading && <Note>Loading your sessions…</Note>}

        {!loading && error && <ErrorNote message={error} onRetry={load} />}

        {/* Above the view switch, not inside one branch: a cancel started in
            the calendar used to fail into a message only the list could show. */}
        {actionError && (
          <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>
            {actionError}
          </Text>
        )}

        {!loading && !error && hasSessions && (
          <View style={{ marginBottom: 16 }}>
            <Segmented
              options={[{ key: 'list', label: 'List' }, { key: 'calendar', label: 'Calendar' }]}
              selected={view}
              onSelect={(k) => setView(k === 'calendar' ? 'calendar' : 'list')}
            />
          </View>
        )}

        {!loading && !error && view === 'calendar' && (
          <MonthCalendar
            sessions={[...bookings.upcoming, ...bookings.past]}
            confirmingId={confirmingId}
            cancellingId={cancellingId}
            onCancel={(b) => { setActionError(null); setConfirmingId(b.id); }}
            onKeep={() => setConfirmingId(null)}
            onConfirmCancel={(b) => void cancelSession(b)}
          />
        )}

        {!loading && !error && view === 'list' && (
          <>
            {progress.length > 0 ? (
              <>
                <SectionHeading style={{ marginBottom: 11 }}>Packages</SectionHeading>
                <View style={{ gap: 10 }}>
                  {progress.map((pack) => {
                    const request = cancels.get(pack.packageId);
                    // 'offered' is still open: the figure is being argued
                    // over, and the pack is what the argument is about.
                    const open = request?.status === 'requested' || request?.status === 'offered';
                    const cancelled = request?.status === 'approved';
                    // Taking a request back, or having it declined, has to
                    // leave you able to ask again. Gating the ask on "a request
                    // exists at all" meant one withdrawal removed the button for
                    // good, with nothing on the card to say why.
                    const settled = request?.status === 'withdrawn' || request?.status === 'rejected';
                    return (
                      <ProgressCard key={pack.packageId} pack={pack} withLabel={`with ${pack.withName}`}
                        request={request}
                        // A cancelled pack books nothing, and a pack with a
                        // question hanging over it should not be spent while
                        // the coach is still deciding.
                        onBook={pack.remaining > 0 && !open && !cancelled
                          ? () => s.openPackBooking(pack.coachId) : undefined}
                        onAskCancel={pack.remaining > 0 && (!request || settled)
                          ? () => { setReason(''); setActionError(null); setAsking(pack); } : undefined}
                        onWithdraw={open
                          ? () => void run(() => withdrawCancellation(request!.id),
                              'Could not take that request back.') : undefined}
                        priceCents={prices.get(pack.packageId) ?? 0}
                        onSettled={() => void load()}
                      />
                    );
                  })}
                </View>
              </>
            ) : packages.length > 0 && (
              <>
                <SectionHeading style={{ marginBottom: 11 }}>Packages</SectionHeading>
                <View style={{ gap: 10 }}>
                  {packages.map((pk) => (
                    <PackageCard key={pk.id} pack={pk} />
                  ))}
                </View>
              </>
            )}

            <SectionHeading style={{ marginTop: progress.length > 0 || packages.length > 0 ? 22 : 0, marginBottom: 11 }}>
              Upcoming
            </SectionHeading>
            <View style={{ gap: 10 }}>
              {bookings.upcoming.length === 0 ? (
                <Note>{hasSessions ? 'Nothing coming up.' : 'No sessions booked yet'}</Note>
              ) : (
                bookings.upcoming.map((b) => (
                  <SessionCard
                    key={b.id}
                    booking={b}
                    confirming={confirmingId === b.id}
                    busy={cancellingId === b.id}
                    onAskCancel={() => {
                      setActionError(null);
                      setConfirmingId(b.id);
                    }}
                    onKeep={() => setConfirmingId(null)}
                    onConfirmCancel={() => onCancel(b)}
                    onAccept={() => onAccept(b)}
                  />
                ))
              )}
            </View>

            {bookings.past.length > 0 && (
              <>
                <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Past</SectionHeading>
                <View style={{ gap: 10 }}>
                  {bookings.past.map((b) => (
                    <SessionCard key={b.id} booking={b} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
        <FormSheet
          visible={Boolean(asking)}
          title="Request cancellation"
          subtitle={asking ? `${asking.remaining} of ${asking.total} sessions are still unused.` : undefined}
          onClose={() => setAsking(null)}
          footer={
            <VoltButton label="Send the request" enabled={Boolean(asking)}
              onPress={() => {
                const pack = asking;
                if (!pack) return;
                void run(async () => {
                  await requestCancellation(pack.coachId, pack.packageId, reason);
                  track('package_cancellation_requested');
                  setAsking(null);
                }, 'Could not send that request.');
              }} />
          }
        >
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            {asking ? asking.withName.split(' ')[0] : 'Your coach'} decides whether to cancel it and how much to give
            back. BOOK’D does not move money — whatever you agree is paid between the two of you.
          </Text>
          <Text style={[t.caption, { color: c.txt3 }]}>
            Sessions you have already booked stay in your calendar. Cancel those separately if you do not want them.
          </Text>
          <Field value={reason} onChange={setReason} label="Why, optionally"
            placeholder="Moving away, injured, changed plans" />
        </FormSheet>
      </View>
    </OverlayScaffold>
  );
}

/** Sessions grouped by the local day they start on. */
// Re-exported: the grid maths moved to lib/calendarGrid so the date picker can
// share it, and these are the names the tests and the rest of this file use.
export { monthCells };
export { dayKey };

export function byDay(sessions: MyBooking[]): Map<string, MyBooking[]> {
  const days = new Map<string, MyBooking[]>();
  for (const session of sessions) {
    const key = dayKey(session.scheduledFor);
    if (!key) continue;
    const existing = days.get(key);
    if (existing) existing.push(session);
    else days.set(key, [session]);
  }
  return days;
}

// Monday-first, matching monthCells and coach_availability.weekday.
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function MonthCalendar({ sessions, confirmingId, cancellingId, onCancel, onKeep, onConfirmCancel }: {
  sessions: MyBooking[];
  confirmingId: string | null;
  cancellingId: string | null;
  onCancel: (b: MyBooking) => void;
  onKeep: () => void;
  onConfirmCancel: (b: MyBooking) => void;
}) {
  const { c, t } = useTheme();
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(() => dayKey(today));

  const days = useMemo(() => byDay(sessions), [sessions]);
  const cells = useMemo(() => monthCells(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const chosen = days.get(selected) ?? [];
  const step = (months: number) =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + months, 1));

  return (
    <View>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <TextAction label="Prev" icon="chevron-left" accessibilityLabel="Previous month" onPress={() => step(-1)} />
        <Text style={[t.labelSm, { color: c.txt }]}>
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <TextAction label="Next" icon="chevron-right" accessibilityLabel="Next month" onPress={() => step(1)} />
      </Row>

      <Row style={{ marginBottom: 6 }}>
        {DOW.map((letter, index) => (
          <View key={`${letter}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[t.caption, { color: c.txt3 }]}>{letter}</Text>
          </View>
        ))}
      </Row>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, index) => {
          if (day === null) return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 46 }} />;
          const key = dayKey(new Date(cursor.getFullYear(), cursor.getMonth(), day));
          const onThisDay = days.get(key) ?? [];
          const isSelected = key === selected;
          const isToday = key === dayKey(today);
          return (
            <Pressable key={key} onPress={() => setSelected(key)} accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${day} ${MONTH_NAMES[cursor.getMonth()]}, ${onThisDay.length} ${onThisDay.length === 1 ? 'session' : 'sessions'}`}
              style={{ width: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSelected ? c.volt : 'transparent',
                borderWidth: isToday && !isSelected ? 1 : 0, borderColor: c.line }}>
                <Text style={[t.bodySm, { color: isSelected ? c.ink : c.txt }]}>{day}</Text>
              </View>
              {/* One dot per session, capped at three -- past that the count
                  stops being readable and the day is simply "busy". */}
              <Row gap={3} style={{ height: 5, marginTop: 1 }}>
                {onThisDay.slice(0, 3).map((session) => (
                  <View key={session.id} style={{ width: 4, height: 4, borderRadius: 2,
                    backgroundColor: kindTint(session.kind, c).rail }} />
                ))}
              </Row>
            </Pressable>
          );
        })}
      </View>

      <Row gap={14} style={{ marginTop: 12, marginBottom: 4 }}>
        {(['coach', 'partner'] as SessionKind[]).map((kind) => {
          const tint = kindTint(kind, c);
          return (
            <Row key={kind} gap={6} style={{ alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint.rail }} />
              <Text style={[t.caption, { color: c.txt2 }]}>{tint.label}</Text>
            </Row>
          );
        })}
      </Row>

      <SectionHeading style={{ marginTop: 14, marginBottom: 11 }}>{selectedLabel(selected)}</SectionHeading>
      <View style={{ gap: 10 }}>
        {chosen.length === 0
          ? <Note>Nothing on this day.</Note>
          : chosen
            .slice()
            .sort((a, b) => Date.parse(a.scheduledFor) - Date.parse(b.scheduledFor))
            .map((session) => (
              <SessionCard key={session.id} booking={session}
                confirming={confirmingId === session.id}
                busy={cancellingId === session.id}
                onAskCancel={canCancel(session.status) ? () => onCancel(session) : undefined}
                onKeep={onKeep}
                onConfirmCancel={() => onConfirmCancel(session)} />
            ))}
      </View>
    </View>
  );
}

function selectedLabel(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return 'Selected day';
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

// What is left of a package, from the bookings themselves.
//
// Four numbers rather than one bar: "3 of 10 used" cannot tell somebody whether
// the other seven are bookable now or already spoken for, and that is the only
// question a person opening this card is asking.
export function ProgressCard({ pack, withLabel, onBook, request, priceCents = 0, onAskCancel, onWithdraw, onSettled }: {
  pack: PackageProgress; withLabel: string;
  /** What the pack sold for. The opening refund figure is the unused share of
   *  it, so a missing price opens the box empty rather than at zero. */
  priceCents?: number;
  /** Absent when the pack has nothing left -- a card that looks tappable and
   *  leads to a screen that cannot book anything is worse than a flat one. */
  onBook?: () => void;
  request?: PackageCancellation;
  onAskCancel?: () => void;
  onWithdraw?: () => void;
  /** Re-read after an offer or an acceptance, so the card and the panel cannot
   *  disagree about where the negotiation got to. */
  onSettled?: () => void;
}) {
  const { c, t } = useTheme();
  const spent = pack.taken + pack.booked + pack.pending;
  const filled = pack.total > 0 ? Math.min(Math.max(spent / pack.total, 0), 1) : 0;
  const card = (
    <Card style={{ padding: 14 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <Row gap={11}>
          <Avatar initials={initials(pack.withName)} size={38} radius={11} fontSize={13} />
          <View>
            <Text style={[t.labelSm, { color: c.txt }]}>{pack.total}-session pack</Text>
            <Text style={[t.caption, { color: c.txt2, marginTop: 1 }]}>{withLabel}</Text>
          </View>
        </Row>
        <Text style={[t.priceSm, { color: c.accent }]}>{pack.remaining} left</Text>
      </Row>
      <View style={{ height: 6, borderRadius: 999, backgroundColor: c.surface2, overflow: 'hidden' }}>
        <View style={{ width: `${filled * 100}%`, height: 6, borderRadius: 999, backgroundColor: c.volt }} />
      </View>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={[t.caption, { color: c.txt2 }]}>{progressSummary(pack)}</Text>
        {/* The whole card is the button -- this is the label that says so,
            not a second control inside the first one. */}
        {onBook && (
          <Row gap={4} style={{ alignItems: 'center' }}>
            <Text style={[t.label, { color: c.accent }]}>Book a session</Text>
            <Icon name="chevron-right" size={16} color={c.accent} />
          </Row>
        )}
      </Row>

      {request && (
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line2 }}>
          {(request.status === 'requested' || request.status === 'offered') && (
            <>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[t.bodySm, { color: c.txt2, flex: 1 }]}>
                  {request.status === 'requested'
                    ? `Cancellation asked for. Waiting on ${pack.withName.split(' ')[0]}.`
                    : 'Settling on what comes back'}
                </Text>
                {onWithdraw && (
                  <Button label="Take it back" icon="rotate-ccw" onPress={onWithdraw}
                    accessibilityLabel="Take the cancellation request back" />
                )}
              </Row>
              {onSettled && (
                <RefundNegotiation request={request}
                  suggestedCents={suggestedRefundCents(pack, priceCents)}
                  onSettled={onSettled} />
              )}
            </>
          )}
          {/* Said out loud rather than by the panel disappearing, which read
              as the app forgetting the request had been made. */}
          {request.status === 'withdrawn' && (
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              You took that cancellation request back. Ask again whenever you like.
            </Text>
          )}
          {request.status === 'approved' && (
            <>
              <Text style={[t.bodySm, { color: c.danger }]}>
                Cancelled{request.refundCents !== null ? ` · ${formatCents(request.refundCents)} back` : ''}
              </Text>
              {/* Said plainly: the app records what the two of them agreed, it
                  does not move anybody's money. */}
              <Text style={[t.caption, { color: c.txt3, marginTop: 2 }]}>
                {pack.withName.split(' ')[0]} pays you directly — BOOK’D does not move money.
              </Text>
            </>
          )}
          {request.status === 'rejected' && (
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              {pack.withName.split(' ')[0]} declined the cancellation. Your sessions are still yours.
            </Text>
          )}
        </View>
      )}
    </Card>
  );
  // The ask sits outside the pressable card: nesting a button inside a button
  // makes which one fired a matter of luck.
  const ask = onAskCancel ? (
    <Button label="Request cancellation" icon="x-circle" tone="danger" onPress={onAskCancel}
      accessibilityLabel={`Ask to cancel the package ${withLabel}`} />
  ) : null;

  return (
    <View style={{ gap: 2 }}>
      {onBook ? (
        <Pressable onPress={onBook} accessibilityRole="button"
          accessibilityLabel={`Book one of the ${pack.remaining} sessions left ${withLabel}`}>
          {card}
        </Pressable>
      ) : card}
      {ask}
    </View>
  );
}

function PackageCard({ pack }: { pack: PackageBalance }) {
  const { c, t } = useTheme();
  const expiry = formatExpiry(pack.expiresOn);
  // A zero total would divide by zero and, worse, imply a full bar.
  const progress = pack.total > 0 ? Math.min(Math.max(pack.used / pack.total, 0), 1) : 0;
  const left = Math.max(pack.total - pack.used, 0);
  return (
    <Card style={{ padding: 14 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <Row gap={11}>
          <Avatar initials={initials(pack.coachName)} size={38} radius={11} fontSize={13} />
          <View>
            <Text style={[t.labelSm, { color: c.txt }]}>{pack.coachName} · {pack.label}</Text>
            <Text style={[t.caption, { color: c.txt2, marginTop: 1 }]}>
              {pack.used} of {pack.total} used{expiry ? ` · ${expiry}` : ''}
            </Text>
          </View>
        </Row>
        <Text style={[t.priceSm, { color: c.accent }]}>{left} left</Text>
      </Row>
      <View style={{ height: 6, borderRadius: 999, backgroundColor: c.surface2, overflow: 'hidden' }}>
        <View style={{ width: `${progress * 100}%`, height: 6, borderRadius: 999, backgroundColor: c.volt }} />
      </View>
    </Card>
  );
}

function SessionCard({
  booking,
  confirming = false,
  busy = false,
  onAskCancel,
  onKeep,
  onConfirmCancel,
  onAccept,
}: {
  booking: MyBooking;
  confirming?: boolean;
  busy?: boolean;
  onAskCancel?: () => void;
  onKeep?: () => void;
  onConfirmCancel?: () => void;
  onAccept?: () => void;
}) {
  const { c, t } = useTheme();
  const badge = statusTint(booking.status, c);
  const kind = kindTint(booking.kind, c);
  const when = formatSessionWhen(booking);
  const cancellable = Boolean(onAskCancel) && canCancel(booking.status);
  return (
    <Card style={{ padding: 14, borderLeftWidth: 3, borderLeftColor: kind.rail }}>
      <Row gap={11}>
        <Avatar initials={initials(booking.withName)} size={40} radius={12} fontSize={14} />
        <View style={{ flex: 1 }}>
          <Text style={[t.name, { color: c.txt }]}>{booking.withName}</Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{when}</Text>
        </View>
        <Row gap={6}>
          <MicroBadge label={kind.label} bg={kind.bg} fg={kind.fg} />
          <MicroBadge label={bookingStatusLabel(booking.status)} bg={badge.bg} fg={badge.fg} />
        </Row>
      </Row>

      {booking.needsAnswer && onAccept && (
        <Row style={{ marginTop: 10, justifyContent: 'space-between' }} gap={10}>
          <Text style={[t.caption, { color: c.txt2, flex: 1 }]}>
            {booking.withName.split(' ')[0]} asked you to train.
          </Text>
          <Row gap={14}>
            <TextAction label={busy ? 'Saving…' : 'Accept'} icon="check" busy={busy}
              accessibilityLabel={`Accept training with ${booking.withName} on ${when}`}
              onPress={busy ? undefined : onAccept} />
            <TextAction label="Decline" icon="x" tone="danger"
              accessibilityLabel={`Decline training with ${booking.withName} on ${when}`}
              onPress={busy ? undefined : onAskCancel} />
          </Row>
        </Row>
      )}

      {cancellable && confirming ? (
        <Row style={{ marginTop: 10, justifyContent: 'space-between' }} gap={10}>
          <Text style={[t.caption, { color: c.txt2, flex: 1 }]}>Cancel this session?</Text>
          <Row gap={14}>
            <TextAction
              label="Keep"
              icon="check"
              accessibilityLabel={`Keep your session with ${booking.withName} on ${when}`}
              onPress={busy ? undefined : onKeep}
            />
            <TextAction
              label={busy ? 'Cancelling…' : 'Yes, cancel'}
              icon="x-circle"
              tone="danger"
              busy={busy}
              accessibilityLabel={`Confirm cancelling your session with ${booking.withName} on ${when}`}
              onPress={busy ? undefined : onConfirmCancel}
            />
          </Row>
        </Row>
      ) : (
        <Row style={{ marginTop: 10 }} gap={8}>
          {/* "Free" rather than "$0" -- a zero price reads like one somebody
              forgot to set, and a partner session has no price by design. */}
          <Text style={[t.caption, { color: c.txt3 }]}>
            {booking.kind === 'partner' ? 'Free' : formatCents(booking.totalCents)}
          </Text>
          <View style={{ flex: 1 }} />
          {cancellable && (
            <TextAction
              label="Cancel"
              icon="x"
              tone="danger"
              accessibilityLabel={`Cancel your session with ${booking.withName} on ${when}`}
              onPress={onAskCancel}
            />
          )}
        </Row>
      )}
    </Card>
  );
}

// The row actions on a booking card. A wrapper rather than <Button> at each
// call site only because the label doubles as the accessible name here: the
// visible word is "Decline" but what is being declined has to be said in full.
function TextAction({
  label,
  icon,
  tone = 'secondary',
  accessibilityLabel,
  onPress,
  busy = false,
}: {
  label: string;
  icon: IconName;
  tone?: ButtonTone;
  accessibilityLabel: string;
  onPress?: () => void;
  busy?: boolean;
}) {
  return (
    <Button label={label} icon={icon} tone={tone} busy={busy}
      enabled={Boolean(onPress)} onPress={onPress ?? (() => {})}
      accessibilityLabel={accessibilityLabel} />
  );
}


// What kind of session it is, in colour AND in words.
//
// Volt for a coach, cyan for a partner -- both are existing theme tokens that
// already work in the light and dark palettes, so neither needed inventing.
//
// The word is not decoration. Colour alone excludes anyone who cannot tell
// these two apart, and this is the only thing distinguishing a session you pay
// for from one you do not.
export function kindTint(kind: SessionKind, c: ReturnType<typeof useTheme>['c']) {
  return kind === 'partner'
    ? { rail: c.cyan, label: 'Partner', bg: alpha(c.cyan, 0.14), fg: c.cyan }
    : { rail: c.volt, label: 'Coach', bg: alpha(c.volt, 0.14), fg: c.accent };
}

// Status colours come straight from the theme tokens the rest of the app uses:
// live = volt, waiting = amber, ended badly = danger, done = neutral.
function statusTint(status: BookingStatus, c: ReturnType<typeof useTheme>['c']) {
  if (status === 'confirmed') return { bg: alpha(c.volt, 0.14), fg: c.accent };
  if (status === 'pending') return { bg: alpha(c.amber, 0.18), fg: c.amberText };
  if (status === 'cancelled' || status === 'no_show') return { bg: alpha(c.danger, 0.12), fg: c.danger };
  return { bg: c.surface2, fg: c.txt2 };
}
