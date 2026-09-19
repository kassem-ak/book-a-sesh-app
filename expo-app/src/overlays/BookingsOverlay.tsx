import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { analyticsErrorCode, track } from '../lib/analytics';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, MicroBadge, Row, SectionHeading, Segmented } from '../components/ui';
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
import { initials } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

const EMPTY: MyBookings = { upcoming: [], past: [] };

export function BookingsOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [bookings, setBookings] = useState<MyBookings>(EMPTY);
  const [packages, setPackages] = useState<PackageBalance[]>([]);
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
      const [mine, balances] = await Promise.all([fetchMyBookings(), fetchMyPackageBalances()]);
      setBookings(mine);
      setPackages(balances);
    } catch (e) {
      setBookings(EMPTY);
      setPackages([]);
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
            onCancel={(b) => { setActionError(null); setConfirmingId(b.id); }}
          />
        )}

        {!loading && !error && view === 'list' && (
          <>
            {packages.length > 0 && (
              <>
                <SectionHeading style={{ marginBottom: 11 }}>Packages</SectionHeading>
                <View style={{ gap: 10 }}>
                  {packages.map((pk) => (
                    <PackageCard key={pk.id} pack={pk} />
                  ))}
                </View>
              </>
            )}

            <SectionHeading style={{ marginTop: packages.length > 0 ? 22 : 0, marginBottom: 11 }}>
              Upcoming
            </SectionHeading>
            {actionError && (
              <Text style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>{actionError}</Text>
            )}
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

function MonthCalendar({ sessions, onCancel }: { sessions: MyBooking[]; onCancel: (b: MyBooking) => void }) {
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
        <TextAction label="‹ Prev" color={c.txt2} accessibilityLabel="Previous month" onPress={() => step(-1)} />
        <Text style={[t.labelSm, { color: c.txt }]}>
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <TextAction label="Next ›" color={c.txt2} accessibilityLabel="Next month" onPress={() => step(1)} />
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
                onAskCancel={canCancel(session.status) ? () => onCancel(session) : undefined} />
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
            <TextAction label={busy ? 'Saving…' : 'Accept'} color={c.accent} busy={busy}
              accessibilityLabel={`Accept training with ${booking.withName} on ${when}`}
              onPress={busy ? undefined : onAccept} />
            <TextAction label="Decline" color={c.txt2}
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
              color={c.txt2}
              accessibilityLabel={`Keep your session with ${booking.withName} on ${when}`}
              onPress={busy ? undefined : onKeep}
            />
            <TextAction
              label={busy ? 'Cancelling…' : 'Yes, cancel'}
              color={c.danger}
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
              color={c.txt2}
              accessibilityLabel={`Cancel your session with ${booking.withName} on ${when}`}
              onPress={onAskCancel}
            />
          )}
        </Row>
      )}
    </Card>
  );
}

function TextAction({
  label,
  color,
  accessibilityLabel,
  onPress,
  busy = false,
}: {
  label: string;
  color: string;
  accessibilityLabel: string;
  onPress?: () => void;
  busy?: boolean;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !onPress, busy }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[t.caption, { fontFamily: t.labelSm.fontFamily, color, opacity: onPress ? 1 : 0.6 }]}>
        {label}
      </Text>
    </Pressable>
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
        <TextAction label="Try again" color={c.txt2} accessibilityLabel="Retry loading your bookings" onPress={onRetry} />
      </Row>
    </Card>
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
