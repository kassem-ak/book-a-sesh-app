import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Icon, MicroBadge, Row, SectionHeading, VoltButton } from '../components/ui';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// ---- demo data ported from the prototype ----
const reportDefs = [
  { id: 'r1', by: 'Alex Morgan', vs: 'Sam Okoro', reason: 'No-show & abusive messages', filed: '2h ago', summary: '12 chat messages · 1 booking · 1 shared event', chat: [{ from: 'Alex Morgan', text: 'I waited 40 minutes at the park. Not cool.', when: 'Mon 9:02 PM' }, { from: 'Sam Okoro', text: 'Your problem. You wasted my time, loser.', when: 'Mon 9:14 PM' }], booking: 'Calisthenics session · Mon Jun 29 · marked no-show', event: "Park Bars Jam · both RSVP'd" },
  { id: 'r2', by: 'Elena V.', vs: 'Yuki T.', reason: 'Harassment in chat', filed: 'Yesterday', summary: '8 chat messages · 1 booking · 1 shared event', chat: [{ from: 'Yuki T.', text: "Spot me or don't bother showing up again.", when: 'Tue 7:40 AM' }], booking: 'Strength session · cancelled by Yuki T.', event: 'Heavy Squat Session · both attended' },
  { id: 'r3', by: 'Nadia R.', vs: 'Tariq Aziz', reason: 'Payment dispute', filed: 'Jun 29', summary: '23 chat messages · 2 bookings', chat: [{ from: 'Nadia R.', text: 'I paid for 5 sessions and only got 3.', when: 'Jun 29' }], booking: '5-session pack · $135 paid · 3 completed', event: 'No shared events' },
];
const flagDefs = [
  { id: 'sf-demo1', line: 'Account: R. Haddad — paused', what: 'Community name · blocked by filter', when: '1h ago', subject: 'R. Haddad', blocked: [{ source: 'Community name', text: 'After Dark Hookups', when: '1h ago' }, { source: 'Chat message to M. Saad', text: '…this app works great as a hookup spot…', when: '2d ago' }], history: ['Member since May 2026 · 3 sessions', '1 previous flag · dismissed', 'Reported once by another user'] },
  { id: 'sf-demo2', line: 'Community: "Late Night Crew" — paused', what: 'Event description · blocked by filter', when: 'Yesterday', subject: 'Community · Late Night Crew', blocked: [{ source: 'Event description', text: '…singles only, things get sexy after midnight…', when: 'Yesterday' }, { source: 'Community about text', text: '…no partners, just fun encounters…', when: '3d ago' }], history: ['Created Jun 2026 · 34 members', 'Unofficial community', '2 member reports this week'] },
];
const loyaltyDefs: [string, string][] = [['l1', 'Free session with any coach'], ['l2', '20% off a 5-session pack'], ['l3', 'Free month of coach subscription']];
const caseLabels: Record<string, string> = { ban: 'Temporarily banned · 7 days', suspend: 'Permanently suspended', dismiss: 'Report dismissed' };

export function AdminReportsOverlay() {
  const { c } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="Misconduct reports" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Safety auto-flags · sexual content</SectionHeading>
        <View style={{ gap: 10 }}>
          {flagDefs.map((f) => {
            const v = s.flagVerdicts[f.id];
            return (
              <Card key={f.id} onPress={() => s.openSafetyCase(f.id)} background={alpha(c.danger, 0.05)} borderColor={alpha(c.danger, 0.28)}>
                <FlagRow f={f} verdict={v} />
              </Card>
            );
          })}
        </View>
        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>User reports</SectionHeading>
        <View style={{ gap: 11 }}>
          {reportDefs.map((r) => (
            <Card key={r.id} onPress={() => s.openCase(r.id)}>
              <ReportRow r={r} decision={s.caseDecisions[r.id]} />
            </Card>
          ))}
        </View>
      </View>
    </OverlayScaffold>
  );
}

function FlagRow({ f, verdict }: { f: (typeof flagDefs)[0]; verdict?: string }) {
  const { c, t } = useTheme();
  return (
    <Row style={{ paddingHorizontal: 14, paddingVertical: 13 }} gap={12}>
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: alpha(c.danger, 0.12), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="alert-triangle" size={17} color={c.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.labelSm, { color: c.txt }]}>{f.line}</Text>
        <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]} numberOfLines={1}>{f.what}</Text>
        {verdict && <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: verdict === 'suspended' ? c.danger : c.accent, marginTop: 7 }]}>{verdict === 'suspended' ? 'Permanently suspended' : 'Reinstated — pause lifted'}</Text>}
      </View>
      <Text style={[t.caption, { color: c.txt3 }]}>{f.when}</Text>
      <Icon name="chevron-right" size={17} color={c.txt3} />
    </Row>
  );
}

function ReportRow({ r, decision }: { r: (typeof reportDefs)[0]; decision?: string }) {
  const { c, t } = useTheme();
  const pending = !decision;
  return (
    <View style={{ padding: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[t.name, { color: c.txt, flex: 1 }]}>{r.by} → {r.vs}</Text>
        <MicroBadge label={decision ? caseLabels[decision] : 'OPEN'} bg={pending ? alpha(c.danger, 0.12) : c.surface2} fg={pending || decision === 'suspend' ? c.danger : decision === 'ban' ? c.amberText : c.txt2} />
      </Row>
      <Text style={[t.bodySm, { color: c.txt2, marginTop: 6 }]}>{r.reason}</Text>
      <Text style={[t.caption, { color: c.txt3, marginTop: 5 }]}>{r.summary} · filed {r.filed}</Text>
    </View>
  );
}

export function AdminCaseOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const r = reportDefs.find((x) => x.id === s.caseId) ?? reportDefs[0];
  const decision = s.caseDecisions[r.id];
  return (
    <OverlayScaffold header={<OverlayHeader title="Case review" onBack={s.backToReports} subtitle={`${r.by} → ${r.vs} · filed ${r.filed}`} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <Card style={{ padding: 14 }}>
          <Text style={[t.name, { color: c.txt }]}>{r.reason}</Text>
          <Text style={[t.caption, { color: c.txt3, marginTop: 3 }]}>Evidence auto-attached: {r.summary}</Text>
        </Card>
        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Chat evidence</SectionHeading>
        <View style={{ gap: 8 }}>
          {r.chat.map((m, i) => (
            <Card key={i} style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: m.from === r.vs ? c.danger : c.txt2 }]}>{m.from}</Text>
                <Text style={[t.caption, { color: c.txt3 }]}>{m.when}</Text>
              </Row>
              <Text style={[t.body, { color: c.soft, marginTop: 4 }]}>"{m.text}"</Text>
            </Card>
          ))}
        </View>
        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Interaction records</SectionHeading>
        <View style={{ gap: 8 }}>
          <RecordRow icon="calendar" label={r.booking} />
          <RecordRow icon="users" label={r.event} />
        </View>
        <View style={{ height: 24 }} />
        {!decision ? (
          <>
            <SectionHeading style={{ marginBottom: 11 }}>Action</SectionHeading>
            <View style={{ gap: 9 }}>
              <Decision label="Temporary ban · 7 days" bg={alpha(c.amber, 0.14)} fg={c.amberText} border={alpha(c.amber, 0.35)} onPress={() => s.decideCase('ban')} />
              <Decision label="Permanent account suspension" bg={alpha(c.danger, 0.12)} fg={c.danger} border={alpha(c.danger, 0.4)} onPress={() => s.decideCase('suspend')} />
              <Decision label="Dismiss report" bg={c.surface} fg={c.txt2} border={c.line} onPress={() => s.decideCase('dismiss')} />
            </View>
          </>
        ) : (
          <Verdict label={`${caseLabels[decision]} — both parties notified`} fg={decision === 'suspend' ? c.danger : decision === 'ban' ? c.amberText : c.txt2} />
        )}
      </View>
    </OverlayScaffold>
  );
}

export function SafetyCaseOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const f = flagDefs.find((x) => x.id === s.safetyCaseId) ?? flagDefs[0];
  const verdict = s.flagVerdicts[f.id];
  return (
    <OverlayScaffold header={<OverlayHeader title="Safety review" onBack={s.backToReports} subtitle={`${f.subject} · flagged ${f.when}`} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <Card style={{ padding: 14 }} background={alpha(c.danger, 0.05)} borderColor={alpha(c.danger, 0.28)}>
          <Row gap={12}>
            <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: alpha(c.danger, 0.12), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="alert-triangle" size={19} color={c.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.name, { color: c.txt }]}>Sexual content · auto-flagged</Text>
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>Paused pending your decision · content policy §3</Text>
            </View>
          </Row>
        </Card>
        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Suspected content</SectionHeading>
        <View style={{ gap: 8 }}>
          {f.blocked.map((b, i) => (
            <Card key={i} borderColor={alpha(c.danger, 0.3)} style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: c.danger }]}>{b.source}</Text>
                <Text style={[t.caption, { color: c.txt3 }]}>{b.when}</Text>
              </Row>
              <Text style={[t.body, { color: c.soft, marginTop: 4 }]}>"{b.text}"</Text>
            </Card>
          ))}
        </View>
        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Account record</SectionHeading>
        <Card>
          {f.history.map((h, i) => (
            <Row key={i} style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomColor: i < f.history.length - 1 ? c.line2 : 'transparent', borderBottomWidth: i < f.history.length - 1 ? 1 : 0 }} gap={10}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.txt3 }} />
              <Text style={[t.bodySm, { color: c.soft }]}>{h}</Text>
            </Row>
          ))}
        </Card>
        <View style={{ height: 24 }} />
        {!verdict ? (
          <>
            <SectionHeading style={{ marginBottom: 11 }}>Decision</SectionHeading>
            <View style={{ gap: 9 }}>
              <Decision label="Reinstate — lift the pause" bg={alpha(c.volt, 0.12)} fg={c.accent} border={alpha(c.volt, 0.35)} onPress={() => s.decideFlag('reinstated')} />
              <Decision label="Permanent suspension" bg={alpha(c.danger, 0.12)} fg={c.danger} border={alpha(c.danger, 0.4)} onPress={() => s.decideFlag('suspended')} />
            </View>
          </>
        ) : (
          <Verdict label={`${verdict === 'suspended' ? 'Permanently suspended' : 'Reinstated — pause lifted'} — subject notified`} fg={verdict === 'suspended' ? c.danger : c.accent} />
        )}
      </View>
    </OverlayScaffold>
  );
}

export function AdminPromosOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="Promotions" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Discount</SectionHeading>
        <Row gap={8}>
          {[10, 15, 20, 30].map((p) => (
            <Pressable key={p} onPress={() => { s.set('promoPct', p); s.set('promoCode', null); }} style={{ flex: 1, alignItems: 'center', borderRadius: 13, backgroundColor: s.promoPct === p ? c.volt : c.surface, borderColor: s.promoPct === p ? c.volt : c.line, borderWidth: 1, paddingVertical: 12 }}>
              <Text style={[t.price, { color: s.promoPct === p ? c.ink : c.txt2 }]}>{p}%</Text>
            </Pressable>
          ))}
        </Row>
        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Audience</SectionHeading>
        <Row gap={8}>
          {['All users', 'New users', 'Inactive 30d'].map((a) => (
            <Pressable key={a} onPress={() => { s.set('promoAud', a); s.set('promoCode', null); }} style={{ flex: 1, alignItems: 'center', borderRadius: 999, backgroundColor: s.promoAud === a ? c.volt : c.surface, borderColor: s.promoAud === a ? c.volt : c.line, borderWidth: 1, paddingVertical: 11 }}>
              <Text style={[t.labelSm, { color: s.promoAud === a ? c.ink : c.txt2 }]}>{a}</Text>
            </Pressable>
          ))}
        </Row>
        <View style={{ marginTop: 22 }}>
          <VoltButton label="Generate promo code" onPress={s.genPromo} />
        </View>
        <SectionHeading style={{ marginTop: 24, marginBottom: 11 }}>Active promos</SectionHeading>
        <View style={{ gap: 10 }}>
          {s.promoCode && <PromoCard code={s.promoCode} sub={`${s.promoPct}% off · ${s.promoAud} · just created`} fresh />}
          <PromoCard code="SUMMER15" sub="15% off single sessions · ends Jul 15" />
        </View>
      </View>
    </OverlayScaffold>
  );
}

export function AdminLoyaltyOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="Loyalty offers" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <Text style={[t.body, { color: c.txt2 }]}>Users earn points per completed session and event. Set the point cost of each reward.</Text>
        <View style={{ height: 18 }} />
        <View style={{ gap: 11 }}>
          {loyaltyDefs.map(([key, label]) => (
            <Card key={key} style={{ padding: 15 }}>
              <Text style={[t.name, { color: c.txt }]}>{label}</Text>
              <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
                <Text style={[t.bodySm, { color: c.txt3 }]}>Point cost</Text>
                <Row gap={10}>
                  <Stepper icon="minus" onPress={() => s.loyaltyAdjust(key, -100)} />
                  <Text style={[t.price, { fontSize: 15, color: c.accent, width: 84, textAlign: 'center' }]}>{s.loyaltyPts[key]} pts</Text>
                  <Stepper icon="plus" onPress={() => s.loyaltyAdjust(key, 100)} />
                </Row>
              </Row>
            </Card>
          ))}
        </View>
      </View>
    </OverlayScaffold>
  );
}

function RecordRow({ icon, label }: { icon: any; label: string }) {
  const { c, t } = useTheme();
  return (
    <Card style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
      <Row gap={11}>
        <Icon name={icon} size={16} color={c.accent} />
        <Text style={[t.bodySm, { color: c.soft }]}>{label}</Text>
      </Row>
    </Card>
  );
}

function Decision({ label, bg, fg, border, onPress }: { label: string; bg: string; fg: string; border: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ height: 48, borderRadius: 14, backgroundColor: bg, borderColor: border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: fg }]}>{label}</Text>
    </Pressable>
  );
}

function Verdict({ label, fg }: { label: string; fg: string }) {
  const { c, t } = useTheme();
  return (
    <View style={{ borderRadius: 14, backgroundColor: c.surface2, padding: 15, alignItems: 'center' }}>
      <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: fg, textAlign: 'center' }]}>{label}</Text>
    </View>
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

function Stepper({ icon, onPress }: { icon: any; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={14} color={c.txt2} />
    </Pressable>
  );
}
