// Notification inbox + abuse reports. Both tables are client-owned rows gated
// by `user_id = current_app_user()` / `reporter_id = current_app_user()`, so
// they are read and written directly rather than through an RPC.
import { currentAppUserId, isPersistedId, relativeWhen } from './chat';
import { supabase } from './supabase';

/** Mirrors the `notif_type` enum in db/schema.sql. */
export type NotificationType =
  | 'platform_update'
  | 'daily_plan'
  | 'booking'
  | 'partner_nearby'
  | 'system';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
  whenLabel: string;
};

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

const INBOX_PAGE = 50;

export async function fetchNotifications(limit = INBOX_PAGE): Promise<AppNotification[]> {
  await currentAppUserId();
  // No `.eq('user_id', me)` needed — the notif_self policy already scopes the
  // read, and filtering again would only duplicate it.
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, read, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.created_at,
    whenLabel: relativeWhen(n.created_at),
  }));
}

export async function markNotificationRead(id: string) {
  await currentAppUserId();
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const me = await currentAppUserId();
  // `.eq('read', false)` keeps the statement from rewriting rows that are
  // already read; the user_id filter is what makes the UPDATE well-formed for
  // PostgREST, which refuses an unfiltered bulk update.
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', me)
    .eq('read', false);
  if (error) throw error;
}

/** Drives the tab-bar dot. Uses a HEAD count so no rows cross the wire. */
export async function unreadNotificationCount() {
  await currentAppUserId();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false);
  if (error) throw error;
  return count ?? 0;
}

// ---- abuse reports ---------------------------------------------------------

export const REPORT_REASONS = [
  'Harassment or abuse',
  'Spam or scam',
  'Fake profile',
  'Unsafe behaviour',
  'Something else',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * Files a moderation case against another member. `status` defaults to 'open'
 * server-side, which is exactly what the admin console lists — so the
 * confirmation the user sees is true.
 *
 * No `.select()` on the way out: `report_ins` grants INSERT only, and reading
 * the row back is admin-gated, so asking for a representation would fail RLS.
 */
export async function submitReport(subjectId: string, reason: string, summary: string) {
  const me = await currentAppUserId();
  if (!isPersistedId(subjectId)) {
    throw new Error('This profile is not available for reports.');
  }
  const { error } = await supabase.from('reports').insert({
    reporter_id: me,
    subject_id: subjectId,
    reason,
    summary: summary.trim() || null,
  });
  if (error) throw error;
}
