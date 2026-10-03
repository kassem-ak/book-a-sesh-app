// Chat data access. Conversations, participants and messages are read straight
// from the tables — there is no SECURITY DEFINER RPC for chat, so every query
// here leans on the RLS policies in db/policies.sql + db/hardening.sql.
import { initials as initialsOf } from '../state/models';
import { screenImageQuietly, screenQuietly } from './gwin';
import { PickedAvatar } from './avatars';
import { removeChatImage, signChatImages, uploadChatImage } from './chatMedia';
import { ensureAppSession } from './session';
import { supabase } from './supabase';

export type ConversationSummary = {
  id: string;
  /** users.id of the other party, or null for a thread we are alone in. */
  counterpartId: string | null;
  name: string;
  initials: string;
  last: string;
  lastAt: string | null;
  whenLabel: string;
  unread: number;
};

export type ChatMessage = {
  id: string;
  body: string;
  /** A short-lived signed link to the picture, or null when there is none or
   *  it can no longer be opened. */
  imageUrl: string | null;
  /** Whether a picture was sent at all -- so a removed one can say so rather
   *  than vanish from the bubble. */
  hasImage: boolean;
  createdAt: string;
  /** True when the signed-in user sent it — drives the volt bubble alignment. */
  mine: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Screens hold ids that may still be offline sample ids ('m1'); those are not rows. */
export function isPersistedId(id: string | null | undefined): id is string {
  return Boolean(id && UUID_RE.test(id));
}

// public.users.id, not auth.users.id. Every RLS predicate compares against
// current_app_user(), and the client has no SELECT on users.auth_id to resolve
// it locally, so ask the database. Cached per auth session because it is on the
// hot path of every read and write below.
let cachedAppUser: { authId: string; appUserId: string } | null = null;

export async function currentAppUserId() {
  await ensureAppSession();
  const { data: session } = await supabase.auth.getSession();
  const authId = session.session?.user?.id ?? '';
  if (cachedAppUser && cachedAppUser.authId === authId) return cachedAppUser.appUserId;

  const { data, error } = await supabase.rpc('current_app_user');
  if (error) throw error;
  const appUserId = (data ?? '') as string;
  if (!appUserId) throw new Error('signed-in app user required');
  cachedAppUser = { authId, appUserId };
  return appUserId;
}

// Timestamps arrive as ISO strings; the design shows a terse relative stamp
// ("2m", "3h", "Yest") rather than a date, so keep the formatting next to the
// data instead of duplicating it in each screen.
export function relativeWhen(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yest';
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type ParticipantRow = { conversation_id: string; last_read_at: string | null };
type CounterpartRow = {
  conversation_id: string;
  user_id: string;
  // PostgREST types a to-one embed as an array; normalised below.
  user: { id: string; name: string; avatar_url: string | null } | { id: string; name: string; avatar_url: string | null }[] | null;
};
type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_path: string | null;
  created_at: string;
};

const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, body, image_path, created_at';

function one<T>(embed: T | T[] | null): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed ?? null;
}

// The last message and the unread count both need message rows, and PostgREST
// cannot express "latest row per group". One windowed read of the newest
// messages across all my threads is cheaper than a query per conversation; the
// cap only degrades the unread badge on a thread with a huge unseen backlog.
const RECENT_MESSAGE_WINDOW = 400;

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const me = await currentAppUserId();

  const { data: mine, error: mineError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', me);
  if (mineError) throw mineError;

  const rows = (mine ?? []) as ParticipantRow[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.conversation_id);

  const [{ data: others, error: othersError }, { data: msgs, error: msgsError }] = await Promise.all([
    supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, user:users(id, name, avatar_url)')
      .in('conversation_id', ids)
      .neq('user_id', me),
    supabase
      .from('messages')
      .select(MESSAGE_COLUMNS)
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(RECENT_MESSAGE_WINDOW),
  ]);
  if (othersError) throw othersError;
  if (msgsError) throw msgsError;

  const counterpartByConv = new Map<string, { id: string; name: string }>();
  for (const row of (others ?? []) as CounterpartRow[]) {
    if (counterpartByConv.has(row.conversation_id)) continue;
    const user = one(row.user);
    counterpartByConv.set(row.conversation_id, {
      id: user?.id ?? row.user_id,
      name: user?.name ?? 'Member',
    });
  }

  const lastByConv = new Map<string, MessageRow>();
  const unreadByConv = new Map<string, number>();
  const readAt = new Map(rows.map((r) => [r.conversation_id, r.last_read_at]));
  for (const m of (msgs ?? []) as MessageRow[]) {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    if (m.sender_id === me) continue;
    const seen = readAt.get(m.conversation_id);
    if (seen && new Date(m.created_at) <= new Date(seen)) continue;
    unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
  }

  return ids
    .map((id) => {
      const counterpart = counterpartByConv.get(id) ?? null;
      const last = lastByConv.get(id) ?? null;
      const name = counterpart?.name ?? 'Conversation';
      return {
        id,
        counterpartId: counterpart?.id ?? null,
        name,
        initials: initialsOf(name),
        // A picture on its own has no text to preview; say what it is.
        last: last ? (last.body.trim() || (last.image_path ? 'Photo' : '')) : 'No messages yet',
        lastAt: last?.created_at ?? null,
        whenLabel: relativeWhen(last?.created_at ?? null),
        unread: unreadByConv.get(id) ?? 0,
      };
    })
    // Newest thread first; threads with no messages sink to the bottom.
    .sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
}

/** Header name for an open thread — the list may not be in memory (deep link, reload). */
export async function fetchCounterpart(conversationId: string) {
  const me = await currentAppUserId();
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('user_id, user:users(id, name, avatar_url)')
    .eq('conversation_id', conversationId)
    .neq('user_id', me)
    .limit(1);
  if (error) throw error;
  const row = (data ?? [])[0] as CounterpartRow | undefined;
  const user = row ? one(row.user) : null;
  return { id: user?.id ?? row?.user_id ?? null, name: user?.name ?? 'Conversation' };
}

// Newest-first with a cap, then reversed: an old thread should open on its
// latest exchange, not page in from the beginning.
const MESSAGE_PAGE = 200;

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const me = await currentAppUserId();
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE);
  if (error) throw error;
  const rows = (data ?? []) as MessageRow[];
  // One request for every picture in the page, not one per bubble.
  const signed = await signChatImages(rows.map((m) => m.image_path));
  return rows
    .map((m) => ({
      id: m.id,
      body: m.body,
      imageUrl: m.image_path ? signed.get(m.image_path) ?? null : null,
      hasImage: !!m.image_path,
      createdAt: m.created_at,
      mine: m.sender_id === me,
    }))
    .reverse();
}

// Returns the stored row rather than the caller's draft so the bubble carries
// the real id and server timestamp — an optimistic echo would duplicate on the
// next refetch.
export async function sendMessage(
  conversationId: string, body: string, image: PickedAvatar | null = null,
): Promise<ChatMessage> {
  const me = await currentAppUserId();
  const text = body.trim();
  if (!text && !image) throw new Error('Message is empty');

  // The picture first: a message row pointing at a file that failed to upload
  // would be a broken bubble for both people.
  const imagePath = image ? await uploadChatImage({ kind: 'dm', id: conversationId }, image) : null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: me, body: text, image_path: imagePath })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) {
    // Do not leave an orphaned picture behind a message that was refused.
    await removeChatImage(imagePath);
    throw error;
  }
  const row = data as MessageRow;
  // After the send, never before it: the keyword trigger on this column works
  // the same way, and a screening call inside the send would make sending slow
  // whenever Anthropic is slow. The picture gets the same pass as the words.
  if (text) screenQuietly('messages', text);
  if (imagePath) screenImageQuietly('messages', imagePath);
  const signed = await signChatImages([imagePath]);
  return {
    id: row.id,
    body: row.body,
    imageUrl: imagePath ? signed.get(imagePath) ?? null : null,
    hasImage: !!imagePath,
    createdAt: row.created_at,
    mine: true,
  };
}

/** Clears the unread badge. Only `last_read_at` is grantable, per db/hardening.sql. */
export async function markConversationRead(conversationId: string) {
  const me = await currentAppUserId();
  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', me);
  if (error) throw error;
}

/**
 * Open (or reuse) a one-to-one thread with someone.
 *
 * The client has no INSERT on `conversations` / `conversation_participants` --
 * deliberately, so nobody can add themselves to a thread they were not put in.
 * `start_conversation` is SECURITY DEFINER and writes both participant rows
 * itself. It returns the existing thread when one already exists, so calling
 * this twice cannot produce two inbox entries for the same pair.
 */
export async function startConversation(otherUserId: string): Promise<string> {
  await ensureAppSession();
  if (!isPersistedId(otherUserId)) throw new Error('That person is not available to message.');
  const { data, error } = await supabase.rpc('start_conversation', { p_other: otherUserId });
  if (error) throw error;
  return data as string;
}
