import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, MicroBadge, Row } from '../components/ui';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function AdminApprovalsOverlay() {
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="Approvals" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18, gap: 11 }}>
        <ApprovalCard type="Hobby request" title="Padel" detail="Sport · requested by 214 users" decision={s.hobbyDecisions['padel']} onApprove={() => s.set('hobbyDecisions', { ...s.hobbyDecisions, padel: 'Approved' })} onDecline={() => s.set('hobbyDecisions', { ...s.hobbyDecisions, padel: 'Rejected' })} />
        <ApprovalCard type="Hobby request" title="Salsa" detail="Hobby · requested by 89 users" decision={s.hobbyDecisions['salsa']} onApprove={() => s.set('hobbyDecisions', { ...s.hobbyDecisions, salsa: 'Approved' })} onDecline={() => s.set('hobbyDecisions', { ...s.hobbyDecisions, salsa: 'Rejected' })} />
        <ApprovalCard type="Official community" title="Chess community" detail="640 members · applied for official status" decision={s.hobbyDecisions['chess-off']} onApprove={() => s.set('hobbyDecisions', { ...s.hobbyDecisions, 'chess-off': 'Approved' })} onDecline={() => s.set('hobbyDecisions', { ...s.hobbyDecisions, 'chess-off': 'Rejected' })} />
        {/* Community and venue registrations have no server table yet, so
            they queue in the store. */}
        {s.pendingRegistrations.map((r) => (
          <ApprovalCard
            key={r.id}
            type={`${r.kind.charAt(0).toUpperCase()}${r.kind.slice(1)} registration`}
            title={r.name}
            detail={r.meta || 'Contact details pending'}
            approveLabel="Open deal"
            declineLabel="Decline"
            decision={r.decision}
            onApprove={() => s.decideRegistration(r.id, 'Approved — onboarding sent')}
            onDecline={() => s.decideRegistration(r.id, 'Declined')}
          />
        ))}
      </View>
    </OverlayScaffold>
  );
}

function ApprovalCard({ type, title, detail, decision, approveLabel = 'Approve', declineLabel = 'Reject', onApprove, onDecline }: { type: string; title: string; detail: string; decision?: string; approveLabel?: string; declineLabel?: string; onApprove: () => void; onDecline: () => void }) {
  const { c, t } = useTheme();
  const pending = !decision;
  const rejected = decision === 'Rejected' || decision === 'Declined';
  return (
    <Card style={{ padding: 15 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <MicroBadge label={type} bg={pending ? alpha(c.amber, 0.18) : alpha(c.volt, 0.12)} fg={pending ? c.amberText : c.accent} />
        <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: pending ? c.amberText : rejected ? c.danger : c.accent }]}>{decision ?? 'Pending'}</Text>
      </Row>
      <Text style={[t.name, { color: c.txt, marginTop: 10 }]}>{title}</Text>
      <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>{detail}</Text>
      {pending && (
        <Row style={{ marginTop: 13 }} gap={9}>
          <SmallAction label={approveLabel} primary onPress={onApprove} />
          <SmallAction label={declineLabel} onPress={onDecline} />
        </Row>
      )}
    </Card>
  );
}

export function SmallAction({ label, primary, onPress }: { label: string; primary?: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ borderRadius: 999, backgroundColor: primary ? c.volt : c.surface2, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: primary ? c.ink : c.txt2 }]}>{label}</Text>
    </Pressable>
  );
}
