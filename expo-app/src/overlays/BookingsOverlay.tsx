import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, MicroBadge, Row, SectionHeading } from '../components/ui';
import {
  BookingStatus,
  MyBooking,
  MyBookings,
  PackageBalance,
  bookingStatusLabel,
  canCancel,
  cancelBooking,
  fetchMyBookings,
  fetchMyPackageBalances,
  formatCents,
  formatExpiry,
  formatSessionWhen,
} from '../lib/bookings';
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

  const onCancel = async (booking: MyBooking) => {
    setCancellingId(booking.id);
    setActionError(null);
    try {
      await cancelBooking(booking.id);
      setConfirmingId(null);
      await load();
    } catch (e) {
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

        {!loading && !error && (
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
}: {
  booking: MyBooking;
  confirming?: boolean;
  busy?: boolean;
  onAskCancel?: () => void;
  onKeep?: () => void;
  onConfirmCancel?: () => void;
}) {
  const { c, t } = useTheme();
  const badge = statusTint(booking.status, c);
  const when = formatSessionWhen(booking);
  const cancellable = Boolean(onAskCancel) && canCancel(booking.status);
  return (
    <Card style={{ padding: 14 }}>
      <Row gap={11}>
        <Avatar initials={initials(booking.coachName)} size={40} radius={12} fontSize={14} />
        <View style={{ flex: 1 }}>
          <Text style={[t.name, { color: c.txt }]}>{booking.coachName}</Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{when}</Text>
        </View>
        <MicroBadge label={bookingStatusLabel(booking.status)} bg={badge.bg} fg={badge.fg} />
      </Row>

      {cancellable && confirming ? (
        <Row style={{ marginTop: 10, justifyContent: 'space-between' }} gap={10}>
          <Text style={[t.caption, { color: c.txt2, flex: 1 }]}>Cancel this session?</Text>
          <Row gap={14}>
            <TextAction
              label="Keep"
              color={c.txt2}
              accessibilityLabel={`Keep your session with ${booking.coachName} on ${when}`}
              onPress={busy ? undefined : onKeep}
            />
            <TextAction
              label={busy ? 'Cancelling…' : 'Yes, cancel'}
              color={c.danger}
              busy={busy}
              accessibilityLabel={`Confirm cancelling your session with ${booking.coachName} on ${when}`}
              onPress={busy ? undefined : onConfirmCancel}
            />
          </Row>
        </Row>
      ) : (
        <Row style={{ marginTop: 10 }} gap={8}>
          <Text style={[t.caption, { color: c.txt3 }]}>{formatCents(booking.totalCents)}</Text>
          <View style={{ flex: 1 }} />
          {cancellable && (
            <TextAction
              label="Cancel"
              color={c.txt2}
              accessibilityLabel={`Cancel your session with ${booking.coachName} on ${when}`}
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

// Status colours come straight from the theme tokens the rest of the app uses:
// live = volt, waiting = amber, ended badly = danger, done = neutral.
function statusTint(status: BookingStatus, c: ReturnType<typeof useTheme>['c']) {
  if (status === 'confirmed') return { bg: alpha(c.volt, 0.14), fg: c.accent };
  if (status === 'pending') return { bg: alpha(c.amber, 0.18), fg: c.amberText };
  if (status === 'cancelled' || status === 'no_show') return { bg: alpha(c.danger, 0.12), fg: c.danger };
  return { bg: c.surface2, fg: c.txt2 };
}
