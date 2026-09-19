import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Icon, Row, SectionHeading, VoltButton } from '../components/ui';
import { coachPackageOptions } from '../state/models';
import { fetchCoachAvailability, fetchPackageUsage, PackageUsage } from '../lib/queries';
import { track } from '../lib/analytics';
import * as D from '../state/sampleData';
import { fetchBlackouts } from '../lib/availability';
import { bookingDayLabel, SCHED_TIMES, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// How far ahead the picker offers. The coach's weekly schedule repeats, so a
// month of it is plenty and keeps the list scannable.
const DAYS_AHEAD = 28;

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const byTime = (slots: string[]) => [...slots].sort((a, b) => SCHED_TIMES.indexOf(a) - SCHED_TIMES.indexOf(b));

const minutesInto = (slot: string) => {
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
  return hour * 60 + Number(match[2]);
};

export type BookableDay = { date: string; day: string; dow: string; slots: string[] };

/** The days this coach can actually be booked on, from today forward.
 *
 *  `week` is keyed 0=Mon..6=Sun, the same as `coach_availability.weekday` and
 *  the same as the server's `extract(isodow) - 1`. A null week means the coach
 *  has not set a schedule, which the booking RPC treats as open — so we offer
 *  every day at suggested times rather than hiding the coach.
 *
 *  Today keeps only slots still ahead: the server accepts today, but offering
 *  a 6:30 AM session at 8 PM is offering something that cannot happen.
 *
 *  `closed` is the coach's days off, which beat the weekly schedule. The RPC
 *  refuses them too -- this is so the client does not offer a day that would be
 *  refused, not the thing that makes the refusal true. */
export function bookableDays(
  week: Record<number, string[]> | null,
  now: Date = new Date(),
  closed: string[] = [],
): BookableDay[] {
  const off = new Set(closed);
  const out: BookableDay[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const elapsed = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < DAYS_AHEAD; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = localDay(date);
    if (off.has(key)) continue;
    const weekday = (date.getDay() + 6) % 7;
    let slots = byTime(week ? week[weekday] ?? [] : D.slotDefs);
    if (i === 0) slots = slots.filter((slot) => minutesInto(slot) > elapsed);
    if (!slots.length) continue;
    out.push({
      date: key,
      day: String(date.getDate()),
      dow: date.toLocaleDateString(undefined, { weekday: 'short' }),
      slots,
    });
  }
  return out;
}

export function BookingOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const p = s.personById(s.openId);

  // EVERY hook runs before the missing-coach return below. Root replaces the
  // people list on refresh, so `p` can go from defined to undefined while this
  // overlay is open; returning early above the hooks changed the hook count
  // between renders and React threw "Rendered fewer hooks than expected",
  // dropping the whole app to the error screen.
  //
  // The first booking records the pack price; later redemptions record zero.
  // Usage establishes pack coverage, not whether the coach has been paid.
  const [usage, setUsage] = React.useState<PackageUsage | null>(null);
  const [usageLoading, setUsageLoading] = React.useState(true);
  // undefined while the coach's schedule is still loading, null once we know
  // they have not set one.
  const [week, setWeek] = React.useState<Record<number, string[]> | null | undefined>(undefined);
  const [closed, setClosed] = React.useState<string[]>([]);
  const [bookingQuote, setBookingQuote] = React.useState<{ redeeming: boolean; dueNow: number } | null>(null);
  const personId = p?.id;
  React.useEffect(() => {
    if (!personId) return;
    let live = true;
    setUsage(null);
    setUsageLoading(true);
    setWeek(undefined);
    fetchPackageUsage().then((rows) => {
      if (live) {
        setUsage(rows);
        setUsageLoading(false);
      }
    });
    // A schedule we cannot read must not hide the coach: fall back to the
    // open-coach offering, which is what the server would accept anyway.
    fetchCoachAvailability(personId).then(
      (rows) => { if (live) setWeek(rows); },
      () => { if (live) setWeek(null); },
    );
    // Days off are a second, independent read. A failure here must not hide the
    // coach: the RPC refuses a closed date anyway, so the worst case is an
    // offered day that comes back with a clear message.
    fetchBlackouts(personId).then(
      (dates) => { if (live) setClosed(dates); },
      () => { if (live) setClosed([]); },
    );
    return () => { live = false; };
  }, [personId]);

  const days = React.useMemo(
    () => (week === undefined ? [] : bookableDays(week, new Date(), closed)),
    [week, closed],
  );
  const bookDate = useStore((state) => state.bookDate);
  const bookSlot = useStore((state) => state.bookSlot);
  const chosen = days.find((entry) => entry.date === bookDate) ?? null;

  // Select the first real opening once the schedule arrives, and re-select if
  // the day or slot the store is holding is not one this coach offers.
  React.useEffect(() => {
    if (!days.length) return;
    const state = useStore.getState();
    const day = days.find((entry) => entry.date === state.bookDate) ?? days[0];
    const slot = day.slots.includes(state.bookSlot ?? '') ? state.bookSlot : day.slots[0];
    if (state.bookDate !== day.date) state.set('bookDate', day.date);
    if (state.bookSlot !== slot) state.set('bookSlot', slot);
  }, [days]);

  if (!p) return <MissingSubject title="Book a session" message="This coach is no longer available." onBack={s.backToPerson} />;

  const pkgs = coachPackageOptions(p);
  const selectedPkg = pkgs[s.bookPkg] ?? pkgs[0];

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
            {selectedPkg.name} with {p.name.split(' ')[0]}
            {bookDate ? ` · ${bookingDayLabel(bookDate)}` : ''}{bookSlot ? ` · ${bookSlot}` : ''}
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
            enabled={!exhausted && Boolean(bookDate && bookSlot)}
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
        <SectionHeading style={{ marginBottom: 11 }}>Day</SectionHeading>
        {week === undefined ? (
          <Text style={[t.bodySm, { color: c.txt3 }]}>Checking when {p.name.split(' ')[0]} is available…</Text>
        ) : days.length === 0 ? (
          <Card style={{ padding: 14 }}>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              {p.name.split(' ')[0]} has no bookable times in the next four weeks. Message them to arrange a session.
            </Text>
          </Card>
        ) : (
          <Row style={{ flexWrap: 'wrap' }} gap={9}>
            {days.map((entry) => {
              const sel = bookDate === entry.date;
              return (
                <Pressable
                  key={entry.date}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={bookingDayLabel(entry.date)}
                  onPress={() => {
                    s.set('bookDate', entry.date);
                    if (!entry.slots.includes(bookSlot ?? '')) s.set('bookSlot', entry.slots[0]);
                  }}
                  style={{ borderRadius: 12, backgroundColor: sel ? c.volt : c.surface, borderColor: sel ? c.volt : c.line, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9, minWidth: 54, alignItems: 'center' }}
                >
                  <Text style={[t.caption, { color: sel ? c.ink : c.txt3 }]}>{entry.dow}</Text>
                  <Text style={[t.labelSm, { color: sel ? c.ink : c.txt }]}>{entry.day}</Text>
                </Pressable>
              );
            })}
          </Row>
        )}

        {chosen && (
          <>
            <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Time</SectionHeading>
            <Row style={{ flexWrap: 'wrap' }} gap={9}>
              {chosen.slots.map((slot) => {
                const sel = bookSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                    onPress={() => s.set('bookSlot', slot)}
                    style={{ borderRadius: 12, backgroundColor: sel ? c.volt : c.surface, borderColor: sel ? c.volt : c.line, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 11 }}
                  >
                    <Text style={[t.labelSm, { color: sel ? c.ink : c.txt }]}>{slot}</Text>
                  </Pressable>
                );
              })}
            </Row>
            {/* An open coach is a coach who never opened "My schedule". The
                server accepts any time for them, so say these are suggestions
                rather than implying a schedule that does not exist. */}
            {week === null && (
              <Text style={[t.caption, { color: c.txt3, marginTop: 9 }]}>
                {p.name.split(' ')[0]} has not published a schedule. These are suggested times — confirm the exact time with them.
              </Text>
            )}
          </>
        )}

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
