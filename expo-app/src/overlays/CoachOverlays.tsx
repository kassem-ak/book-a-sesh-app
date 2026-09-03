import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, VoltButton } from '../components/ui';
import { SCHED_TIMES, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

const apptReqs = [
  { id: 'a1', who: 'Alex Morgan', initials: 'AM', kind: 'NEW BOOKING', what: 'Single session · Thu 09 · 6:30 PM', note: 'Iron Yard Gym, Hamra' },
  { id: 'a2', who: 'Chris P.', initials: 'CP', kind: 'CHANGE REQUEST', what: 'Move to Sat 11 · 8:00 AM', note: 'was Fri 10 · 6:30 PM' },
];
const clientPacks = [
  { who: 'Alex Morgan', initials: 'AM', pack: '5-session pack', used: 3, total: 5, expiry: 'Valid until Aug 29' },
  { who: 'Chris P.', initials: 'CP', pack: '5-session pack', used: 4, total: 5, expiry: 'Valid until Jul 20' },
  { who: 'Nadia R.', initials: 'NR', pack: 'Monthly plan', used: 9, total: 12, expiry: 'Renews Jul 12' },
];
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const dayNames: Record<string, string> = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };

export function CoachRequestsOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="Appointment requests" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <View style={{ gap: 11 }}>
          {apptReqs.map((a) => {
            const decision = s.apptDecisions[a.id];
            return (
              <Card key={a.id} style={{ padding: 14 }}>
                <Row gap={11}>
                  <Avatar initials={a.initials} size={40} radius={12} fontSize={14} />
                  <View style={{ flex: 1 }}>
                    <Text style={[t.name, { color: c.txt }]}>{a.who}</Text>
                    <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{a.what}</Text>
                  </View>
                  <MicroBadge label={a.kind} bg={alpha(c.amber, 0.14)} fg={c.amberText} />
                </Row>
                <Text style={[t.caption, { color: c.txt3, marginTop: 10 }]}>{a.note}</Text>
                <View style={{ marginTop: 12 }}>
                  {decision ? (
                    <View style={{ borderRadius: 11, backgroundColor: c.surface2, paddingVertical: 10, alignItems: 'center' }}>
                      <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: decision === 'Approved' ? c.accent : c.danger }]}>{decision}</Text>
                    </View>
                  ) : (
                    <Row gap={8}>
                      <ApptBtn label="Approve" bg={c.volt} fg={c.ink} onPress={() => s.set('apptDecisions', { ...s.apptDecisions, [a.id]: 'Approved' })} />
                      <ApptBtn label="Decline" bg={c.surface2} fg={c.danger} onPress={() => s.set('apptDecisions', { ...s.apptDecisions, [a.id]: 'Declined' })} />
                    </Row>
                  )}
                </View>
              </Card>
            );
          })}
        </View>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Client packages</SectionHeading>
        <View style={{ gap: 10 }}>
          {clientPacks.map((p) => (
            <Card key={p.who} style={{ paddingHorizontal: 14, paddingVertical: 13 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={11}>
                  <Avatar initials={p.initials} size={38} radius={11} fontSize={13} />
                  <View>
                    <Text style={[t.labelSm, { color: c.txt }]}>{p.who} · {p.pack}</Text>
                    <Text style={[t.caption, { color: c.txt2, marginTop: 1 }]}>{p.used} of {p.total} used · {p.expiry}</Text>
                  </View>
                </Row>
                <Text style={[t.priceSm, { color: c.accent }]}>{p.total - p.used} left</Text>
              </Row>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: c.surface2, overflow: 'hidden', marginTop: 10 }}>
                <View style={{ width: `${(p.used / p.total) * 100}%`, height: 6, borderRadius: 999, backgroundColor: c.volt }} />
              </View>
            </Card>
          ))}
        </View>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Rate your trainee</SectionHeading>
        <Card style={{ padding: 15 }}>
          <Row gap={11}>
            <Avatar initials="AM" size={40} radius={12} fontSize={14} />
            <View style={{ flex: 1 }}>
              <Text style={[t.name, { color: c.txt }]}>Alex Morgan</Text>
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{s.coachRate > 0 ? `Rated ${s.coachRate}/5 — posted to Alex's public profile` : 'Session completed Mon · rating is 5-point, trained clients only'}</Text>
            </View>
          </Row>
          <Row style={{ marginTop: 12, justifyContent: 'center' }} gap={6}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => s.set('coachRate', n)}>
                <Text style={{ fontSize: 30, color: s.coachRate >= n ? c.amber : c.mono }}>★</Text>
              </Pressable>
            ))}
          </Row>
        </Card>
        <Text style={[t.bodySm, { color: c.txt3, marginTop: 14 }]}>You can rate and publicly review only trainees you've trained, on a 5-point scale.</Text>
      </View>
    </OverlayScaffold>
  );
}

function ApptBtn({ label, bg, fg, onPress }: { label: string; bg: string; fg: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flex: 1, borderRadius: 11, backgroundColor: bg, paddingVertical: 10, alignItems: 'center' }}>
      <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function CoachScheduleOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const slots = s.daySlots();
  return (
    <OverlayScaffold header={<OverlayHeader title="My schedule" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <Text style={[t.body, { color: c.txt2 }]}>Set which slots clients can book, day by day. Changes apply to new bookings instantly.</Text>
        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Day</SectionHeading>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {DAYS.map((d) => {
            const sel = s.schedDay === d;
            const has = (s.schedule[d] ?? []).length > 0;
            return (
              <Pressable key={d} onPress={() => s.set('schedDay', d)} style={{ alignItems: 'center', borderRadius: 13, backgroundColor: sel ? c.volt : c.surface, borderColor: sel ? c.volt : c.line, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 }}>
                <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: sel ? c.ink : c.txt2 }]}>{d}</Text>
                <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 4, backgroundColor: !has ? 'transparent' : sel ? c.ink : c.accent }} />
              </Pressable>
            );
          })}
        </ScrollView>

        <Row style={{ marginTop: 22, marginBottom: 11, justifyContent: 'space-between' }}>
          <SectionHeading>Bookable slots</SectionHeading>
          <Pressable onPress={s.setDayOff}><Text style={[t.caption, { fontFamily: t.labelSm.fontFamily, color: c.danger }]}>Set day off</Text></Pressable>
        </Row>
        <Row style={{ flexWrap: 'wrap' }} gap={9}>
          {slots.map((slot) => (
            <Row key={slot} style={{ borderRadius: 999, backgroundColor: alpha(c.volt, 0.1), borderColor: alpha(c.volt, 0.3), borderWidth: 1, paddingLeft: 15, paddingRight: 8, paddingVertical: 8 }} gap={8}>
              <Text style={[t.labelSm, { color: c.accent }]}>{slot}</Text>
              <Pressable onPress={() => s.removeSlot(slot)} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={11} color={c.txt2} />
              </Pressable>
            </Row>
          ))}
        </Row>

        <Card style={{ marginTop: 18, padding: 11 }}>
          <Row gap={10}>
            <Stepper icon="minus" onPress={() => s.set('addTimeIdx', Math.max(0, s.addTimeIdx - 1))} />
            <Text style={[t.overlayTitle, { fontSize: 16, color: c.txt, flex: 1, textAlign: 'center' }]}>{s.addTimeLabel()}</Text>
            <Stepper icon="plus" onPress={() => s.set('addTimeIdx', Math.min(SCHED_TIMES.length - 1, s.addTimeIdx + 1))} />
            <Pressable onPress={s.addSlot} style={{ borderRadius: 11, backgroundColor: s.canAddSlot() ? c.volt : c.surface2, paddingHorizontal: 18, paddingVertical: 10 }}>
              <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: s.canAddSlot() ? c.ink : c.txt3 }]}>{s.canAddSlot() ? 'Add' : 'Added'}</Text>
            </Pressable>
          </Row>
        </Card>

        <Card style={{ marginTop: 16, paddingHorizontal: 14, paddingVertical: 13 }}>
          <Row gap={8}>
            <Icon name="clock" size={15} color={c.accent} />
            <Text style={[t.labelSm, { color: c.strong }]}>{slots.length === 0 ? `${dayNames[s.schedDay]} is a day off` : `${slots.length} slot${slots.length > 1 ? 's' : ''} bookable on ${dayNames[s.schedDay]}s`}</Text>
          </Row>
        </Card>
      </View>
    </OverlayScaffold>
  );
}

export function CoachPackagesOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="Packages & promos" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Your packages</SectionHeading>
        <View style={{ gap: 11 }}>
          {s.myPackages.map((p) => (
            <Card key={p.id} style={{ padding: 15 }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.name, { color: c.txt }]}>{p.sessions === 1 ? 'Single session' : `${p.sessions}-session pack`}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>${Math.round(p.price / p.sessions)} per session · 60 min each</Text>
                </View>
                <Pressable onPress={() => s.removePkg(p.id)} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="x" size={12} color={c.txt2} />
                </Pressable>
              </Row>
              <Row style={{ marginTop: 13 }} gap={10}>
                <PkgStepper value={`${p.sessions}`} unit="sessions" onMinus={() => s.updPkg(p.id, -1)} onPlus={() => s.updPkg(p.id, 1)} />
                <PkgStepper value={`$${p.price}`} unit="total price" accent onMinus={() => s.updPkg(p.id, 0, -5)} onPlus={() => s.updPkg(p.id, 0, 5)} />
              </Row>
            </Card>
          ))}
        </View>

        <View style={{ marginTop: 18, borderRadius: 16, borderColor: c.line, borderWidth: 1.5, borderStyle: 'dashed', padding: 15 }}>
          <Text style={[t.labelSm, { color: c.txt2 }]}>New package — {s.newPkgSessions === 1 ? 'Single session' : `${s.newPkgSessions}-session pack`}</Text>
          <Row style={{ marginTop: 12 }} gap={10}>
            <PkgStepper value={`${s.newPkgSessions}`} unit="sessions" onMinus={() => s.set('newPkgSessions', Math.max(1, s.newPkgSessions - 1))} onPlus={() => s.set('newPkgSessions', s.newPkgSessions + 1)} />
            <PkgStepper value={`$${s.newPkgPrice}`} unit="total price" accent onMinus={() => s.set('newPkgPrice', Math.max(5, s.newPkgPrice - 5))} onPlus={() => s.set('newPkgPrice', s.newPkgPrice + 5)} />
          </Row>
          <View style={{ marginTop: 12 }}>
            <VoltButton label="Add package" height={44} onPress={s.addPackage} />
          </View>
        </View>

        <SectionHeading style={{ marginTop: 26, marginBottom: 11 }}>Create a promo</SectionHeading>
        <Row gap={8}>
          {[10, 15, 20, 25].map((p) => (
            <Pressable key={p} onPress={() => { s.set('cPromoPct', p); s.set('cPromoCode', null); }} style={{ flex: 1, alignItems: 'center', borderRadius: 13, backgroundColor: s.cPromoPct === p ? c.volt : c.surface, borderColor: s.cPromoPct === p ? c.volt : c.line, borderWidth: 1, paddingVertical: 12 }}>
              <Text style={[t.price, { color: s.cPromoPct === p ? c.ink : c.txt2 }]}>{p}%</Text>
            </Pressable>
          ))}
        </Row>
        <View style={{ marginTop: 12 }}>
          <VoltButton label="Generate my promo code" onPress={s.genCoachPromo} />
        </View>
        <SectionHeading style={{ marginTop: 24, marginBottom: 11 }}>Your active promos</SectionHeading>
        <View style={{ gap: 10 }}>
          {s.cPromoCode ? (
            <PromoCard code={s.cPromoCode} sub={`${s.cPromoPct}% off your sessions - just created`} fresh />
          ) : (
            <Card style={{ padding: 14 }}>
              <Text style={[t.bodySm, { color: c.txt2 }]}>No active promos.</Text>
            </Card>
          )}
        </View>
        <Text style={[t.bodySm, { color: c.txt3, marginTop: 16 }]}>Your promos apply to your sessions only. Platform-wide promotions are managed by BOOK'D admins.</Text>
      </View>
    </OverlayScaffold>
  );
}

function Stepper({ icon, onPress }: { icon: any; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={14} color={c.txt2} />
    </Pressable>
  );
}

function PkgStepper({ value, unit, accent, onMinus, onPlus }: { value: string; unit: string; accent?: boolean; onMinus: () => void; onPlus: () => void }) {
  const { c, t } = useTheme();
  return (
    <Row style={{ flex: 1, borderRadius: 12, backgroundColor: c.surface2, paddingHorizontal: 8, paddingVertical: 7 }} gap={0}>
      <Pressable onPress={onMinus} style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="minus" size={12} color={c.txt2} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[t.priceSm, { color: accent ? c.accent : c.txt }]}>{value}</Text>
        <Text style={[t.caption, { fontSize: 10, color: c.txt3 }]}>{unit}</Text>
      </View>
      <Pressable onPress={onPlus} style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={12} color={c.txt2} />
      </Pressable>
    </Row>
  );
}

function PromoCard({ code, sub, fresh }: { code: string; sub: string; fresh?: boolean }) {
  const { c, t } = useTheme();
  return (
    <Card>
      <Row style={{ paddingHorizontal: 14, paddingVertical: 13 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: 15, letterSpacing: 0.5, color: c.accent }}>{code}</Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{sub}</Text>
        </View>
        {fresh && <MicroBadge label="NEW" bg={alpha(c.volt, 0.14)} fg={c.accent} />}
      </Row>
    </Card>
  );
}
