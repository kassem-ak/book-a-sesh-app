import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Icon, Row, SectionHeading, VoltButton } from '../components/ui';
import { coachPackageOptions } from '../state/models';
import { fetchPackageUsage, PackageUsage } from '../lib/queries';
import { track } from '../lib/analytics';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function BookingOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const p = s.personById(s.openId);
  if (!p) return <MissingSubject title="Book a session" message="This coach is no longer available." onBack={s.backToPerson} />;
  // No day is greyed out here: the coach's saved schedule is enforced by the
  // server at confirm time, not mirrored into this calendar. A client can still
  // tap a day the coach does not work and is refused on confirm. Showing it
  // up front needs the schedule fetched per coach -- worth doing, not done.
  const full: number[] = [];
  const pkgs = coachPackageOptions(p);
  const selectedPkg = pkgs[s.bookPkg] ?? pkgs[0];

  // The first booking records the pack price; later redemptions record zero.
  // Usage establishes pack coverage, not whether the coach has been paid.
  const [usage, setUsage] = React.useState<PackageUsage | null>(null);
  const [usageLoading, setUsageLoading] = React.useState(true);
  const [bookingQuote, setBookingQuote] = React.useState<{ redeeming: boolean; dueNow: number } | null>(null);
  React.useEffect(() => {
    let live = true;
    setUsage(null);
    setUsageLoading(true);
    fetchPackageUsage().then((rows) => {
      if (live) {
        setUsage(rows);
        setUsageLoading(false);
      }
    });
    return () => { live = false; };
  }, [p.id]);

  const usageKnown = !selectedPkg?.packageId || usage !== null;
  const balance = selectedPkg?.packageId ? usage?.[selectedPkg.packageId] : undefined;
  const total = balance?.total ?? selectedPkg?.sessions ?? 0;
  const remaining = total - (balance?.used ?? 0);
  const redeeming = Boolean(balance) && remaining > 0;
  const exhausted = Boolean(balance) && remaining <= 0;
  const dueNow = redeeming ? 0 : selectedPkg?.price ?? 0;
  const priceLabel = !usageKnown
    ? usageLoading ? 'Loading…' : 'Unavailable'
    : redeeming
      ? 'Included'
      : dueNow > 0
        ? `$${dueNow}`
        : 'To agree';

  if (s.booked) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Booking confirmed" onBack={s.closeOverlay} />}>
        <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 60 }}>
          <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={34} color={c.ink} />
          </View>
          <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>You are booked!</Text>
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>
            {selectedPkg.name} with {p.name.split(' ')[0]} · {D.bookingMonthName} {s.bookDay} · {D.slotDefs[s.bookSlot]}
          </Text>
          {bookingQuote && (
            <Text style={[t.bodySm, { color: c.txt3, marginTop: 8, textAlign: 'center' }]}>
              {bookingQuote.redeeming
                ? 'Covered by your pack — nothing extra to pay for this booking.'
                : bookingQuote.dueNow > 0
                  ? `$${bookingQuote.dueNow} is payable to ${p.name.split(' ')[0]} directly at your session.`
                  : `Agree the price with ${p.name.split(' ')[0]} directly — BOOK'D does not take payment.`}
            </Text>
          )}
          <View style={{ height: 24 }} />
          <View style={{ width: '100%' }}>
            <VoltButton label="View in bookings" onPress={s.goToBookings} />
          </View>
        </View>
      </OverlayScaffold>
    );
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title="Book a session" onBack={s.backToPerson} subtitle={p.name} />}
      bottomBar={
        <View style={{ backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: 1, padding: 16 }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={[t.body, { color: c.txt2 }]}>{redeeming ? 'Due now' : 'Total'}</Text>
            <Text style={[t.price, { color: c.accent }]}>{priceLabel}</Text>
          </Row>
          <Text style={[t.caption, { color: c.txt3, marginBottom: 12 }]}>
            {!usageKnown
              ? usageLoading ? 'Checking your pack balance…' : 'Could not check your pack balance. You can still book.'
              : exhausted
                ? 'Every session in this pack has been used. Pick another option.'
                : redeeming
                  ? `Covered by your pack — nothing extra to pay for this booking. ${remaining} of ${total} sessions left in this pack.`
                  : dueNow > 0
                    ? "Payable to the coach at your session — BOOK'D does not take payment."
                    : "This coach has not set a price. Agree it with them directly — BOOK'D does not take payment."}
          </Text>
          <VoltButton
            label={exhausted ? 'Pack already used' : 'Confirm booking'}
            enabled={!exhausted}
            onPress={() => {
              // A late balance read may include this booking's redemption.
              // Only the quote known before submission can describe it.
              const quote = usageKnown ? { redeeming, dueNow } : null;
              setBookingQuote(quote);
              void s.confirmBooking().then(() => {
                if (!useStore.getState().booked) return;
                // The amount the screen actually quoted. When the balance was
                // still unknown the event carries no amount at all -- a wrong
                // number in the funnel is worse than a missing one.
                track('booking_confirmed', quote
                  ? { booking_type: quote.redeeming ? 'redemption' : 'purchase', amount_cents: quote.dueNow * 100 }
                  : {});
              });
            }}
            busy={s.writeBusy === 'booking'}
            busyLabel="Booking..."
          />
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>{D.monthLabel}</SectionHeading>
        <Card style={{ padding: 14 }}>
          <Row style={{ justifyContent: 'space-around', marginBottom: 8 }}>
            {DOW.map((d, i) => (
              <Text key={i} style={[t.caption, { color: c.txt3, width: 36, textAlign: 'center' }]}>{d}</Text>
            ))}
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: D.firstDow }).map((_, i) => (
              <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 42 }} />
            ))}
            {Array.from({ length: D.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isFull = full.includes(day);
              const isPast = day < D.todayNum;
              const sel = s.bookDay === day;
              const disabled = isFull || isPast;
              return (
                <Pressable
                  key={day}
                  onPress={() => !disabled && s.set('bookDay', day)}
                  style={{ width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: sel ? c.volt : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[t.labelSm, { color: sel ? c.ink : disabled ? c.mono : c.txt, textDecorationLine: isFull ? 'line-through' : 'none' }]}>{day}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Time</SectionHeading>
        <Row style={{ flexWrap: 'wrap' }} gap={9}>
          {D.slotDefs.map((slot, i) => {
            const sel = s.bookSlot === i;
            return (
              <Pressable key={slot} onPress={() => s.set('bookSlot', i)} style={{ borderRadius: 12, backgroundColor: sel ? c.volt : c.surface, borderColor: sel ? c.volt : c.line, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 11 }}>
                <Text style={[t.labelSm, { color: sel ? c.ink : c.txt }]}>{slot}</Text>
              </Pressable>
            );
          })}
        </Row>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Package</SectionHeading>
        <View style={{ gap: 10 }}>
          {pkgs.map((pk, i) => {
            const sel = s.bookPkg === i;
            return (
              <Pressable key={pk.name} onPress={() => {
                s.set('bookPkg', i);
                track('package_selected', { package_index: i, sessions: pk.sessions });
              }}>
                <Card background={sel ? alpha(c.volt, 0.1) : c.surface} borderColor={sel ? c.volt : c.line} style={{ padding: 14 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View>
                      <Text style={[t.name, { color: c.txt }]}>{pk.name}</Text>
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{pk.note}</Text>
                    </View>
                    <Text style={[t.price, { color: c.accent }]}>${pk.price}</Text>
                  </Row>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>
    </OverlayScaffold>
  );
}
