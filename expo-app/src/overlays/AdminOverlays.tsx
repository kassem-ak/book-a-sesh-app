import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { analyticsErrorCode, track } from '../lib/analytics';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import {
  Button, Card, Icon, MicroBadge, Row, SectionHeading, VoltButton,
} from '../components/ui';
import {
  DECISION_LABEL,
  FlagVerdict,
  ModerationReport,
  ReportDecision,
  ReportEvidence,
  SafetyFlag,
  VERDICT_LABEL,
  decideReport,
  decideSafetyFlag,
  fetchReport,
  fetchReportEvidence,
  fetchSafetyFlag,
  fetchSafetyFlags,
  fetchReports,
  formatFiled,
} from '../lib/moderation';
import { currentAppUserId } from '../lib/bookings';
import { ensureAppSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// ---------------------------------------------------------------------------
// Promotions & loyalty data access
//
// `platform_promos` and `loyalty_rewards` are gated by `promo_adm` /
// `reward_adm` (is_platform_admin()), so a non-admin reads what is public and
// cannot write. Every write is selected back — RLS turns a forbidden write into
// a silent zero-row success, and `.single()` turns that into an error instead
// of a green tick over nothing. Pattern: lib/moderation.ts.
// ---------------------------------------------------------------------------

// Exactly the live `promo_audience` enum.
type PromoAudience = 'all' | 'new' | 'inactive_30d';

const AUDIENCES: [PromoAudience, string][] = [
  ['all', 'All users'],
  ['new', 'New users'],
  ['inactive_30d', 'Inactive 30d'],
];

type PlatformPromo = { id: string; code: string; pct: number; audience: PromoAudience };
type LoyaltyReward = { id: string; label: string; pointCost: number };

async function fetchPlatformPromos(): Promise<PlatformPromo[]> {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('platform_promos')
    .select('id, code, pct, audience')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    code: row.code,
    pct: row.pct,
    audience: row.audience,
  }));
}

// ponytail: random suffix; `platform_promos.code` is unique, so a collision
// surfaces as a save error rather than a silent duplicate. Server-side
// generation if codes ever need to be unguessable.
function promoSuffix() {
  return Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
}

async function createPlatformPromo(pct: number, audience: PromoAudience) {
  const adminId = await currentAppUserId();
  const { error } = await supabase
    .from('platform_promos')
    .insert({ code: `BOOKD${pct}-${promoSuffix()}`, pct, audience, created_by: adminId })
    .select('id, code')
    .single();
  if (error) throw error;
}

// Retire rather than delete: a redemption record could reference the promo, and
// deactivating is reversible.
async function retirePlatformPromo(id: string) {
  await ensureAppSession();
  const { error } = await supabase
    .from('platform_promos')
    .update({ active: false })
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw error;
}

async function fetchLoyaltyRewards(): Promise<LoyaltyReward[]> {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('loyalty_rewards')
    .select('id, label, point_cost')
    .order('point_cost', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({ id: row.id, label: row.label, pointCost: row.point_cost }));
}

async function setRewardCost(id: string, pointCost: number) {
  await ensureAppSession();
  const { error } = await supabase
    .from('loyalty_rewards')
    .update({ point_cost: pointCost })
    .eq('id', id)
    .select('id, point_cost')
    .single();
  if (error) throw error;
}

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

// A decision is a *record*, not an enforcement action: nothing in the database
// bans the account, and `notifications` carries no INSERT grant for the app, so
// no one is messaged. Every string below has to stay honest about that.
const RECORDED_CAVEAT = 'Saved to the case record. It does not change the account or notify anyone — handle enforcement separately.';

// The store still seeds caseId/safetyCaseId with prototype ids ('r1',
// 'sf-demo1'). Those are not uuids, and handing one to PostgREST is a 400, so
// check the shape before querying and treat anything else as "no case open".
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AdminReportsOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [flags, setFlags] = useState<SafetyFlag[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [flagRows, reportRows] = await Promise.all([fetchSafetyFlags(), fetchReports()]);
      setFlags(flagRows);
      setReports(reportRows);
    } catch (e) {
      setFlags([]);
      setReports([]);
      setError(e instanceof Error ? e.message : 'Could not load the moderation queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <OverlayScaffold header={<OverlayHeader title="Misconduct reports" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <Text style={[t.bodySm, { color: c.txt3, marginBottom: 11 }]}>
          Decisions are recorded for review only. No bans or suspensions are applied, and no one is notified.
        </Text>
        {loading && <Note>Loading the moderation queue…</Note>}
        {!loading && error && <ErrorNote message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <SectionHeading style={{ marginBottom: 11 }}>Safety auto-flags</SectionHeading>
            <View style={{ gap: 10 }}>
              {flags.length === 0 ? (
                <Note>Nothing flagged.</Note>
              ) : (
                flags.map((f) => (
                  <Card
                    key={f.id}
                    onPress={() => s.openSafetyCase(f.id)}
                    background={f.verdict ? undefined : alpha(c.danger, 0.05)}
                    borderColor={f.verdict ? undefined : alpha(c.danger, 0.28)}
                  >
                    <FlagRow flag={f} />
                  </Card>
                ))
              )}
            </View>

            <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>User reports</SectionHeading>
            <View style={{ gap: 11 }}>
              {reports.length === 0 ? (
                <Note>No reports filed.</Note>
              ) : (
                reports.map((r) => (
                  <Card key={r.id} onPress={() => s.openCase(r.id)}>
                    <ReportRow report={r} />
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}

function FlagRow({ flag }: { flag: SafetyFlag }) {
  const { c, t } = useTheme();
  const decided = flag.verdict !== null;
  return (
    <Row style={{ paddingHorizontal: 14, paddingVertical: 13 }} gap={12}>
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: alpha(c.danger, 0.12), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="alert-triangle" size={17} color={c.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.labelSm, { color: c.txt }]} numberOfLines={1}>
          {subjectLine(flag)}
        </Text>
        <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]} numberOfLines={1}>
          {flag.source ?? 'Flagged content'}{flag.auto ? ' · blocked by filter' : ''}
        </Text>
        {decided && (
          <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: flag.verdict === 'suspended' ? c.danger : c.accent, marginTop: 7 }]}>
            Decision recorded · {VERDICT_LABEL[flag.verdict as FlagVerdict]}
          </Text>
        )}
      </View>
      <Text style={[t.caption, { color: c.txt3 }]}>{formatFiled(flag.createdAt)}</Text>
      <Icon name="chevron-right" size={17} color={c.txt3} />
    </Row>
  );
}

function subjectLine(flag: SafetyFlag) {
  const kind = flag.subjectType === 'community' ? 'Community' : 'Account';
  return `${kind}: ${flag.subjectName}`;
}

function ReportRow({ report }: { report: ModerationReport }) {
  const { c, t } = useTheme();
  const open = report.status === 'open' || report.decision === null;
  return (
    <View style={{ padding: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[t.name, { color: c.txt, flex: 1 }]}>{report.reporterName} → {report.subjectName}</Text>
        <MicroBadge
          label={open ? 'OPEN' : DECISION_LABEL[report.decision as ReportDecision]}
          bg={open ? alpha(c.danger, 0.12) : c.surface2}
          fg={open || report.decision === 'suspend' ? c.danger : report.decision === 'ban' ? c.amberText : c.txt2}
        />
      </Row>
      <Text style={[t.bodySm, { color: c.txt2, marginTop: 6 }]}>{report.reason}</Text>
      <Text style={[t.caption, { color: c.txt3, marginTop: 5 }]}>
        {report.summary ? `${report.summary} · ` : ''}filed {formatFiled(report.createdAt)}
      </Text>
    </View>
  );
}

export function AdminCaseOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const caseId = s.caseId;
  const [report, setReport] = useState<ModerationReport | null>(null);
  const [evidence, setEvidence] = useState<ReportEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!UUID_RE.test(caseId)) {
      setReport(null);
      setEvidence([]);
      setLoading(false);
      return;
    }
    try {
      const [row, rows] = await Promise.all([fetchReport(caseId), fetchReportEvidence(caseId)]);
      setReport(row);
      setEvidence(rows);
    } catch (e) {
      setReport(null);
      setEvidence([]);
      setError(e instanceof Error ? e.message : 'Could not load this case.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (decision: ReportDecision) => {
    setBusy(true);
    setError(null);
    try {
      setReport(await decideReport(caseId, decision));
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(e instanceof Error ? e.message : 'The decision was not saved.');
    } finally {
      setBusy(false);
    }
  };

  const subtitle = report ? `${report.reporterName} → ${report.subjectName} · filed ${formatFiled(report.createdAt)}` : undefined;

  return (
    <OverlayScaffold header={<OverlayHeader title="Case review" onBack={s.backToReports} subtitle={subtitle} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {loading && <Note>Loading the case…</Note>}
        {!loading && error && !report && <ErrorNote message={error} onRetry={load} />}
        {!loading && !error && !report && <Note>That case is no longer in the queue.</Note>}

        {!loading && report && (
          <>
            <Card style={{ padding: 14 }}>
              <Text style={[t.name, { color: c.txt }]}>{report.reason}</Text>
              <Text style={[t.caption, { color: c.txt3, marginTop: 3 }]}>
                {report.summary ?? 'The reporter left no summary.'}
              </Text>
            </Card>

            <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Attached evidence</SectionHeading>
            <View style={{ gap: 8 }}>
              {evidence.length === 0 ? (
                <Note>No evidence was attached to this report.</Note>
              ) : (
                evidence.map((e) => <EvidenceCard key={e.id} item={e} />)
              )}
            </View>

            <View style={{ height: 24 }} />
            {error && <Text style={[t.bodySm, { color: c.danger, marginBottom: 11 }]}>{error}</Text>}

            {report.decision === null ? (
              <>
                <SectionHeading style={{ marginBottom: 11 }}>Action</SectionHeading>
                <Text style={[t.caption, { color: c.txt3, marginBottom: 11 }]}>
                  These record your verdict on the case. They do not change the account or message anyone.
                </Text>
                <View style={{ gap: 9 }}>
                  <Decision label="Record a temporary ban" bg={alpha(c.amber, 0.14)} fg={c.amberText} border={alpha(c.amber, 0.35)} busy={busy} onPress={() => decide('ban')} />
                  <Decision label="Record a permanent suspension" bg={alpha(c.danger, 0.12)} fg={c.danger} border={alpha(c.danger, 0.4)} busy={busy} onPress={() => decide('suspend')} />
                  <Decision label="Dismiss the report" bg={c.surface} fg={c.txt2} border={c.line} busy={busy} onPress={() => decide('dismiss')} />
                </View>
              </>
            ) : (
              <Verdict
                label={`Decision recorded · ${DECISION_LABEL[report.decision]}`}
                caveat={RECORDED_CAVEAT}
                fg={report.decision === 'suspend' ? c.danger : report.decision === 'ban' ? c.amberText : c.txt2}
              />
            )}
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}

export function SafetyCaseOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const flagId = s.safetyCaseId;
  const [flag, setFlag] = useState<SafetyFlag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!UUID_RE.test(flagId)) {
      setFlag(null);
      setLoading(false);
      return;
    }
    try {
      setFlag(await fetchSafetyFlag(flagId));
    } catch (e) {
      setFlag(null);
      setError(e instanceof Error ? e.message : 'Could not load this flag.');
    } finally {
      setLoading(false);
    }
  }, [flagId]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (verdict: FlagVerdict) => {
    setBusy(true);
    setError(null);
    try {
      setFlag(await decideSafetyFlag(flagId, verdict));
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(e instanceof Error ? e.message : 'The decision was not saved.');
    } finally {
      setBusy(false);
    }
  };

  const subtitle = flag ? `${flag.subjectName} · flagged ${formatFiled(flag.createdAt)}` : undefined;

  return (
    <OverlayScaffold header={<OverlayHeader title="Safety review" onBack={s.backToReports} subtitle={subtitle} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {loading && <Note>Loading the flag…</Note>}
        {!loading && error && !flag && <ErrorNote message={error} onRetry={load} />}
        {!loading && !error && !flag && <Note>That flag is no longer in the queue.</Note>}

        {!loading && flag && (
          <>
            <Card style={{ padding: 14 }} background={alpha(c.danger, 0.05)} borderColor={alpha(c.danger, 0.28)}>
              <Row gap={12}>
                <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: alpha(c.danger, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="alert-triangle" size={19} color={c.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.name, { color: c.txt }]}>{flag.auto ? 'Auto-flagged content' : 'Flagged content'}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{subjectLine(flag)}</Text>
                </View>
              </Row>
            </Card>

            <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Flagged content</SectionHeading>
            <Card borderColor={alpha(c.danger, 0.3)} style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: c.danger }]}>
                  {flag.source ?? 'Unrecorded source'}
                </Text>
                <Text style={[t.caption, { color: c.txt3 }]}>{formatFiled(flag.createdAt)}</Text>
              </Row>
              <Text style={[t.body, { color: c.soft, marginTop: 4 }]}>
                {flag.content ? `"${flag.content}"` : 'The flagged text was not stored with this flag.'}
              </Text>
            </Card>

            <View style={{ height: 24 }} />
            {error && <Text style={[t.bodySm, { color: c.danger, marginBottom: 11 }]}>{error}</Text>}

            {flag.verdict === null ? (
              <>
                <SectionHeading style={{ marginBottom: 11 }}>Decision</SectionHeading>
                <Text style={[t.caption, { color: c.txt3, marginBottom: 11 }]}>
                  These record your verdict on the flag. They do not change the account or message anyone.
                </Text>
                <View style={{ gap: 9 }}>
                  <Decision label="Record: reinstate" bg={alpha(c.volt, 0.12)} fg={c.accent} border={alpha(c.volt, 0.35)} busy={busy} onPress={() => decide('reinstated')} />
                  <Decision label="Record: permanent suspension" bg={alpha(c.danger, 0.12)} fg={c.danger} border={alpha(c.danger, 0.4)} busy={busy} onPress={() => decide('suspended')} />
                </View>
              </>
            ) : (
              <Verdict
                label={`Decision recorded · ${VERDICT_LABEL[flag.verdict]}`}
                caveat={RECORDED_CAVEAT}
                fg={flag.verdict === 'suspended' ? c.danger : c.accent}
              />
            )}
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}

export function AdminPromosOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [promos, setPromos] = useState<PlatformPromo[]>([]);
  const [pct, setPct] = useState(15);
  const [audience, setAudience] = useState<PromoAudience>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPromos(await fetchPlatformPromos());
    } catch (e) {
      setPromos([]);
      setError(errorText(e, 'Could not load promotions.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // The router unmounts the overlay when it closes, so one load on mount is the
  // whole lifecycle; every write below re-runs it.
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (write: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await write();
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setActionError(errorText(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="Promotions" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {/* Promo codes persist, but no booking flow redeems them. */}
        <Text style={[t.bodySm, { color: c.txt3, marginBottom: 11 }]}>
          Codes are recorded in the platform promo list. They are not yet redeemable in the app and do not change booking prices.
        </Text>
        <SectionHeading style={{ marginBottom: 11 }}>Recorded percentage</SectionHeading>
        <Row gap={8}>
          {[10, 15, 20, 30].map((p) => (
            <Pressable
              key={p}
              onPress={() => setPct(p)}
              accessibilityRole="radio"
              accessibilityLabel={`Record ${p} percent`}
              accessibilityState={{ selected: pct === p }}
              style={{ flex: 1, alignItems: 'center', borderRadius: 13, backgroundColor: pct === p ? c.volt : c.surface, borderColor: pct === p ? c.volt : c.line, borderWidth: 1, paddingVertical: 12 }}
            >
              <Text style={[t.price, { color: pct === p ? c.ink : c.txt2 }]}>{p}%</Text>
            </Pressable>
          ))}
        </Row>
        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Audience</SectionHeading>
        <Row gap={8}>
          {AUDIENCES.map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setAudience(value)}
              accessibilityRole="radio"
              accessibilityLabel={`Audience: ${label}`}
              accessibilityState={{ selected: audience === value }}
              style={{ flex: 1, alignItems: 'center', borderRadius: 999, backgroundColor: audience === value ? c.volt : c.surface, borderColor: audience === value ? c.volt : c.line, borderWidth: 1, paddingVertical: 11 }}
            >
              <Text style={[t.labelSm, { color: audience === value ? c.ink : c.txt2 }]}>{label}</Text>
            </Pressable>
          ))}
        </Row>
        <View style={{ marginTop: 22 }}>
          <VoltButton
            label="Generate promo code"
            enabled={!busy && !loading && !error}
            busy={busy}
            busyLabel="Saving..."
            onPress={() => run(() => createPlatformPromo(pct, audience), 'Could not create that promo code.')}
          />
        </View>

        <SectionHeading style={{ marginTop: 24, marginBottom: 11 }}>Recorded promo codes</SectionHeading>
        {actionError && <Text style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>{actionError}</Text>}
        {loading && <Note>Loading promotions...</Note>}
        {!loading && error && <ErrorNote message={error} onRetry={load} />}
        {!loading && !error && (
          <View style={{ gap: 10 }}>
            {promos.length === 0 ? (
              <Note>No promo codes to show.</Note>
            ) : (
              promos.map((promo) => (
                <PromoCard
                  key={promo.id}
                  code={promo.code}
                  sub={`${promo.pct}% recorded · ${AUDIENCES.find(([v]) => v === promo.audience)?.[1] ?? promo.audience} · not redeemable in the app`}
                  onRemove={() => run(() => retirePlatformPromo(promo.id), 'Could not deactivate that promo.')}
                  removeLabel={`Deactivate promo code ${promo.code}`}
                  disabled={busy}
                />
              ))
            )}
          </View>
        )}
      </View>
    </OverlayScaffold>
  );
}

export function AdminLoyaltyOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRewards(await fetchLoyaltyRewards());
    } catch (e) {
      setRewards([]);
      setError(errorText(e, 'Could not load loyalty rewards.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ponytail: each tap writes and reloads — last write wins if someone hammers
  // the stepper. A dirty-then-save button if that ever bites.
  const bump = async (reward: LoyaltyReward, delta: number) => {
    const next = Math.max(0, reward.pointCost + delta);
    if (next === reward.pointCost) return;
    setBusy(true);
    setActionError(null);
    try {
      await setRewardCost(reward.id, next);
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setActionError(errorText(e, 'Could not save that point cost.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="Loyalty offers" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {/* Point cost is real config in loyalty_rewards. Earning and redeeming
            are not wired, so the old "users earn points per session" claim is
            gone rather than restated. */}
        <Text style={[t.body, { color: c.txt2 }]}>
          Set the point cost of each reward. The catalogue is saved, but earning and redeeming points are not live
          yet, so nothing is charged against a balance.
        </Text>
        <View style={{ height: 18 }} />

        {actionError && <Text style={[t.bodySm, { color: c.danger, marginBottom: 10 }]}>{actionError}</Text>}
        {loading && <Note>Loading rewards...</Note>}
        {!loading && error && <ErrorNote message={error} onRetry={load} />}
        {!loading && !error && (
          <View style={{ gap: 11 }}>
            {rewards.length === 0 ? (
              <Note>No loyalty rewards are set up yet.</Note>
            ) : (
              rewards.map((reward) => (
                <Card key={reward.id} style={{ padding: 15 }}>
                  <Text style={[t.name, { color: c.txt }]}>{reward.label}</Text>
                  <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
                    <Text style={[t.bodySm, { color: c.txt3 }]}>Point cost</Text>
                    <Row gap={10}>
                      <Stepper
                        icon="minus"
                        label={`Lower the point cost of ${reward.label}`}
                        disabled={busy}
                        onPress={() => void bump(reward, -100)}
                      />
                      <Text style={[t.price, { fontSize: 15, color: c.accent, width: 84, textAlign: 'center' }]}>
                        {reward.pointCost} pts
                      </Text>
                      <Stepper
                        icon="plus"
                        label={`Raise the point cost of ${reward.label}`}
                        disabled={busy}
                        onPress={() => void bump(reward, 100)}
                      />
                    </Row>
                  </Row>
                </Card>
              ))
            )}
          </View>
        )}
      </View>
    </OverlayScaffold>
  );
}

function EvidenceCard({ item }: { item: ReportEvidence }) {
  const { c, t } = useTheme();
  return (
    <Card style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: c.txt2 }]}>
          {item.from ?? item.kind}
        </Text>
        {item.when ? <Text style={[t.caption, { color: c.txt3 }]}>{item.when}</Text> : null}
      </Row>
      <Text style={[t.body, { color: c.soft, marginTop: 4 }]}>
        {item.text ?? `${item.kind} record attached — no readable snapshot stored.`}
      </Text>
    </Card>
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
      <Button label="Try again" icon="refresh-cw" tone="danger" onPress={onRetry}
        accessibilityLabel="Retry loading" style={{ marginTop: 12 }} />
    </Card>
  );
}

function Decision({ label, bg, fg, border, onPress, busy = false }: { label: string; bg: string; fg: string; border: string; onPress: () => void; busy?: boolean }) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      style={{ height: 48, borderRadius: 14, backgroundColor: bg, borderColor: border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
    >
      <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: fg }]}>{busy ? 'Saving…' : label}</Text>
    </Pressable>
  );
}

function Verdict({ label, caveat, fg }: { label: string; caveat: string; fg: string }) {
  const { c, t } = useTheme();
  return (
    <View style={{ borderRadius: 14, backgroundColor: c.surface2, padding: 15, alignItems: 'center' }}>
      <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: fg, textAlign: 'center' }]}>{label}</Text>
      <Text style={[t.caption, { color: c.txt3, textAlign: 'center', marginTop: 7 }]}>{caveat}</Text>
    </View>
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
          <Text style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: 15, letterSpacing: 0.5, color: c.accent }}>{code}</Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{sub}</Text>
        </View>
        <Pressable
          onPress={disabled ? undefined : onRemove}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
          accessibilityState={{ disabled }}
          style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
        >
          <Icon name="x" size={12} color={c.txt2} />
        </Pressable>
      </Row>
    </Card>
  );
}

function Stepper({ icon, label, disabled = false, onPress }: { icon: 'minus' | 'plus'; label: string; disabled?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
    >
      <Icon name={icon} size={14} color={c.txt2} />
    </Pressable>
  );
}
