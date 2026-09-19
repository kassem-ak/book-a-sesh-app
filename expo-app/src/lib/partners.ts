import { currentAppUserId } from './bookings';
import { supabase } from './supabase';

// Training with a peer, free.
//
// Deliberately not the bookings table: bookings carries total_cents and
// commission_cents and is what the revenue views read. A zero-money row for
// every peer session would mean every one of those views has to remember to
// filter them out, and one forgotten filter makes the platform's own numbers
// wrong.

export type PartnerSessionStatus = 'proposed' | 'accepted' | 'declined' | 'cancelled';

export type PartnerSession = {
  id: string;
  scheduledFor: string;
  slotLabel: string | null;
  note: string | null;
  status: PartnerSessionStatus;
  /** The other person, whichever side of it this account is on. */
  withId: string;
  withName: string;
  withAvatarUrl: string | null;
  /** True when this account proposed it, so the UI knows whose move it is. */
  mine: boolean;
};

const asStatus = (value: unknown): PartnerSessionStatus =>
  value === 'accepted' || value === 'declined' || value === 'cancelled' ? value : 'proposed';

/** Every session this account is part of, either side, soonest first. */
export async function fetchPartnerSessions(): Promise<PartnerSession[]> {
  const appId = await currentAppUserId();
  const { data, error } = await supabase
    .from('partner_sessions')
    .select(`id, scheduled_for, slot_label, note, status, proposer_id, partner_id,
             proposer:users!partner_sessions_proposer_id_fkey(id, name, avatar_url),
             partner:users!partner_sessions_partner_id_fkey(id, name, avatar_url)`)
    .order('scheduled_for', { ascending: true });
  if (error) throw error;

  const one = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? value[0] ?? null : value);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const mine = row.proposer_id === appId;
    const other = one(
      (mine ? row.partner : row.proposer) as { id: string; name: string; avatar_url: string | null } | null,
    );
    return {
      id: String(row.id),
      scheduledFor: String(row.scheduled_for),
      slotLabel: (row.slot_label as string) ?? null,
      note: (row.note as string) ?? null,
      status: asStatus(row.status),
      withId: String(mine ? row.partner_id : row.proposer_id),
      // A session outlives the profile read that named the other person.
      withName: other?.name ?? 'Member',
      withAvatarUrl: other?.avatar_url ?? null,
      mine,
    };
  });
}

/** Ask someone to train. Status is left to its 'proposed' default: the RLS
 *  check refuses any other value, which is what stops a session appearing in
 *  someone's calendar without them agreeing to it. */
export async function proposePartnerSession(input: {
  partnerId: string;
  scheduledFor: string;
  slotLabel: string;
  note?: string;
}): Promise<void> {
  const appId = await currentAppUserId();
  if (appId === input.partnerId) throw new Error('Pick someone else to train with.');
  const { error } = await supabase.from('partner_sessions').insert({
    proposer_id: appId,
    partner_id: input.partnerId,
    scheduled_for: input.scheduledFor,
    slot_label: input.slotLabel,
    note: input.note?.trim() || null,
  });
  if (error) throw error;
}

/** Accept, decline or cancel. Who may do which is decided server-side: only
 *  the invited person answers, either side can cancel. */
export async function decidePartnerSession(id: string, status: 'accepted' | 'declined' | 'cancelled'): Promise<void> {
  const { error } = await supabase.rpc('decide_partner_session', { p_id: id, p_status: status });
  if (error) throw error;
}
