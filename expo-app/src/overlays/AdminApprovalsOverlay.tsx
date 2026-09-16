import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, MicroBadge, Row, SectionHeading } from '../components/ui';
import { decideSportRequest, fetchPendingSportRequests, SportRequest } from '../lib/queries';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function AdminApprovalsOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [requests, setRequests] = useState<SportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await fetchPendingSportRequests());
    } catch {
      setRequests([]);
      setError('Could not load pending sport and hobby requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    if (busyId) return;
    setBusyId(id);
    setActionError(null);
    try {
      await decideSportRequest(id, status);
      await load();
    } catch (e) {
      // A failed response cannot establish whether the server saved the write.
      setActionError(e instanceof Error ? e.message : 'Could not confirm the decision. Refresh requests before trying again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="Approvals" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18, gap: 11 }}>
        <SectionHeading>Sport and hobby requests</SectionHeading>
        {loading ? (
          <Text style={[t.bodySm, { color: c.txt2 }]}>Loading requests…</Text>
        ) : error ? (
          <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>
        ) : requests.length === 0 ? (
          <Card style={{ padding: 16 }}>
            <Text style={[t.bodySm, { color: c.txt2 }]}>No pending sport or hobby requests.</Text>
          </Card>
        ) : requests.map((r) => (
          <ApprovalCard
            key={r.id}
            type={r.kind === 'sport' ? 'Sport request' : 'Hobby request'}
            title={r.name}
            detail={r.votes == null ? undefined : `${r.votes} ${r.votes === 1 ? 'vote' : 'votes'}`}
            busy={busyId === r.id}
            disabled={busyId !== null || actionError !== null}
            onApprove={() => { void decide(r.id, 'approved'); }}
            onDecline={() => { void decide(r.id, 'rejected'); }}
          />
        ))}
        {actionError && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{actionError}</Text>}
        <Row>
          <SmallAction label="Refresh requests" disabled={loading || busyId !== null} onPress={() => { setActionError(null); void load(); }} />
        </Row>
        {/* Community and venue registrations have no server table yet, so
            keep their local decisions visibly separate from persisted requests. */}
        {s.pendingRegistrations.length > 0 && (
          <>
            <SectionHeading>Local registrations</SectionHeading>
            <Text style={[t.bodySm, { color: c.txt3 }]}>
              Held on this device until the app restarts. Requests and decisions are not sent to admins or applicants.
            </Text>
          </>
        )}
        {s.pendingRegistrations.map((r) => (
          <ApprovalCard
            key={r.id}
            type={`${r.kind.charAt(0).toUpperCase()}${r.kind.slice(1)} registration`}
            title={r.name}
            detail={r.meta || 'Contact details pending'}
            declineLabel="Decline"
            decision={r.decision}
            onApprove={() => s.decideRegistration(r.id, 'Approved')}
            onDecline={() => s.decideRegistration(r.id, 'Declined')}
          />
        ))}
      </View>
    </OverlayScaffold>
  );
}

function ApprovalCard({ type, title, detail, decision, approveLabel = 'Approve', declineLabel = 'Reject', busy = false, disabled = false, onApprove, onDecline }: { type: string; title: string; detail?: string; decision?: string; approveLabel?: string; declineLabel?: string; busy?: boolean; disabled?: boolean; onApprove: () => void; onDecline: () => void }) {
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
      {detail && <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>{detail}</Text>}
      {pending && (
        <Row style={{ marginTop: 13 }} gap={9}>
          <SmallAction label={approveLabel} accessibilityLabel={`${approveLabel} ${title}`} primary busy={busy} disabled={disabled} onPress={onApprove} />
          <SmallAction label={declineLabel} accessibilityLabel={`${declineLabel} ${title}`} busy={busy} disabled={disabled} onPress={onDecline} />
        </Row>
      )}
    </Card>
  );
}

export function SmallAction({ label, accessibilityLabel = label, primary, busy = false, disabled = false, onPress }: { label: string; accessibilityLabel?: string; primary?: boolean; busy?: boolean; disabled?: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled, busy }} style={{ minHeight: 44, justifyContent: 'center', opacity: disabled ? 0.5 : 1, borderRadius: 999, backgroundColor: primary ? c.volt : c.surface2, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: primary ? c.ink : c.txt2 }]}>{label}</Text>
    </Pressable>
  );
}
