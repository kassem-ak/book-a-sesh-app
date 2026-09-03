// Moderation data-access for the admin console.
//
// Every table here is gated server-side by `is_platform_admin()` (policies
// `report_adm`, `evidence_adm`, `flag_adm`), so a non-admin simply reads an
// empty queue and cannot write a verdict. The client never asserts admin-ness
// itself — it just reports what the server returned.
//
// What these writes do and do not do: recording a decision sets
// `reports.decision` / `safety_flags.verdict` plus `decided_by`. There is no
// trigger that bans the account, and `notifications` carries no INSERT grant
// for `authenticated`, so nothing is enforced and nobody is messaged. The UI
// must say exactly that.
import { currentAppUserId } from './bookings';
import { ensureAppSession } from './session';
import { supabase } from './supabase';

// Exactly the live `report_status`, `report_decision` and `flag_verdict` enums.
export type ReportStatus = 'open' | 'decided';
export type ReportDecision = 'ban' | 'suspend' | 'dismiss';
export type FlagVerdict = 'reinstated' | 'suspended';

export type ModerationReport = {
  id: string;
  reason: string;
  summary: string | null;
  status: ReportStatus;
  decision: ReportDecision | null;
  createdAt: string;
  reporterName: string;
  subjectName: string;
};

export type SafetyFlag = {
  id: string;
  subjectType: string;
  subjectId: string;
  subjectName: string;
  source: string | null;
  content: string | null;
  auto: boolean;
  verdict: FlagVerdict | null;
  createdAt: string;
};

export type ReportEvidence = {
  id: string;
  kind: string;
  from: string | null;
  text: string | null;
  when: string | null;
};

type Related<T> = T | T[] | null | undefined;

function firstRelated<T>(value: Related<T>): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

type PartyName = { name?: string | null };

type ReportRow = {
  id: string;
  reason: string;
  summary: string | null;
  status: ReportStatus;
  decision: ReportDecision | null;
  created_at: string;
  reporter?: Related<PartyName>;
  subject?: Related<PartyName>;
};

type FlagRow = {
  id: string;
  subject_type: string;
  subject_id: string;
  source: string | null;
  content: string | null;
  auto: boolean | null;
  verdict: FlagVerdict | null;
  created_at: string;
};

const REPORT_SELECT =
  'id, reason, summary, status, decision, created_at, reporter:users!reports_reporter_id_fkey(name), subject:users!reports_subject_id_fkey(name)';
const FLAG_SELECT = 'id, subject_type, subject_id, source, content, auto, verdict, created_at';

export const DECISION_LABEL: Record<ReportDecision, string> = {
  ban: 'Temporary ban',
  suspend: 'Permanent suspension',
  dismiss: 'Dismissed',
};

export const VERDICT_LABEL: Record<FlagVerdict, string> = {
  reinstated: 'Reinstated',
  suspended: 'Suspension',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2h ago" / "Yesterday" / "Jun 29" — the queue's sense of urgency is the age. */
export function formatFiled(iso: string) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const minutes = Math.floor((Date.now() - at.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 48 * 60) return 'Yesterday';
  return `${MONTHS[at.getMonth()]} ${at.getDate()}`;
}

function toReport(row: ReportRow): ModerationReport {
  return {
    id: row.id,
    reason: row.reason,
    summary: row.summary,
    status: row.status,
    decision: row.decision,
    createdAt: row.created_at,
    // A reporter who deleted their account leaves reporter_id null by design.
    reporterName: firstRelated(row.reporter)?.name ?? 'Deleted account',
    subjectName: firstRelated(row.subject)?.name ?? 'Unknown account',
  };
}

/**
 * `safety_flags.subject_id` carries no foreign key — it points at a user or a
 * community depending on `subject_type` — so the name has to be resolved in a
 * second pass rather than embedded.
 */
async function resolveSubjectNames(rows: FlagRow[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const userIds = rows.filter((r) => r.subject_type === 'user').map((r) => r.subject_id);
  const communityIds = rows.filter((r) => r.subject_type === 'community').map((r) => r.subject_id);

  if (userIds.length) {
    const { data } = await supabase.from('users').select('id, name').in('id', userIds);
    for (const row of (data ?? []) as { id: string; name: string | null }[]) {
      if (row.name) names.set(row.id, row.name);
    }
  }
  if (communityIds.length) {
    const { data } = await supabase.from('communities').select('id, name').in('id', communityIds);
    for (const row of (data ?? []) as { id: string; name: string | null }[]) {
      if (row.name) names.set(row.id, row.name);
    }
  }
  return names;
}

function toFlag(row: FlagRow, names: Map<string, string>): SafetyFlag {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    subjectName: names.get(row.subject_id) ?? 'Unknown subject',
    source: row.source,
    content: row.content,
    auto: row.auto ?? true,
    verdict: row.verdict,
    createdAt: row.created_at,
  };
}

/**
 * The open queue first, then what has already been decided — an admin needs to
 * see the verdict they just recorded, not have the case vanish.
 */
export async function fetchReports(): Promise<ModerationReport[]> {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as ReportRow[]).map(toReport);
}

export async function fetchReport(reportId: string): Promise<ModerationReport | null> {
  await ensureAppSession();
  const { data, error } = await supabase.from('reports').select(REPORT_SELECT).eq('id', reportId).maybeSingle();
  if (error) throw error;
  return data ? toReport(data as unknown as ReportRow) : null;
}

/**
 * Evidence frozen at report time. `snapshot` is free-form jsonb, so read the
 * fields we know and show nothing rather than guess at the rest.
 */
export async function fetchReportEvidence(reportId: string): Promise<ReportEvidence[]> {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('report_evidence')
    .select('id, kind, snapshot')
    .eq('report_id', reportId);
  if (error) throw error;

  return ((data ?? []) as { id: string; kind: string; snapshot: Record<string, unknown> | null }[]).map((row) => {
    const snap = row.snapshot ?? {};
    const pick = (key: string) => (typeof snap[key] === 'string' ? (snap[key] as string) : null);
    return {
      id: row.id,
      kind: row.kind,
      from: pick('from') ?? pick('author') ?? null,
      text: pick('text') ?? pick('body') ?? pick('title') ?? pick('label') ?? null,
      when: pick('when') ?? pick('at') ?? null,
    };
  });
}

export async function fetchSafetyFlags(): Promise<SafetyFlag[]> {
  await ensureAppSession();
  const { data, error } = await supabase
    .from('safety_flags')
    .select(FLAG_SELECT)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = (data ?? []) as unknown as FlagRow[];
  const names = await resolveSubjectNames(rows);
  return rows.map((row) => toFlag(row, names));
}

export async function fetchSafetyFlag(flagId: string): Promise<SafetyFlag | null> {
  await ensureAppSession();
  const { data, error } = await supabase.from('safety_flags').select(FLAG_SELECT).eq('id', flagId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as FlagRow;
  return toFlag(row, await resolveSubjectNames([row]));
}

/**
 * Records the admin's verdict on a report. Selecting the row back is
 * deliberate: RLS turns a write the caller is not allowed to make into a silent
 * zero-row success, and `.single()` turns that into an error the UI can show
 * instead of a green tick over nothing.
 */
export async function decideReport(reportId: string, decision: ReportDecision): Promise<ModerationReport> {
  const adminId = await currentAppUserId();
  // Own columns only on the way back — the joined reporter/subject names are
  // re-read below, so the write itself stays a plain update.
  const { error } = await supabase
    .from('reports')
    .update({ decision, status: 'decided', decided_by: adminId })
    .eq('id', reportId)
    .select('id, status, decision, decided_by')
    .single();
  if (error) throw error;

  const saved = await fetchReport(reportId);
  if (!saved) throw new Error('The decision was saved but the case could not be re-read.');
  return saved;
}

export async function decideSafetyFlag(flagId: string, verdict: FlagVerdict): Promise<SafetyFlag> {
  const adminId = await currentAppUserId();
  const { data, error } = await supabase
    .from('safety_flags')
    .update({ verdict, decided_by: adminId })
    .eq('id', flagId)
    .select(FLAG_SELECT)
    .single();
  if (error) throw error;
  const row = data as unknown as FlagRow;
  return toFlag(row, await resolveSubjectNames([row]));
}
