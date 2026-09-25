import { useEffect, useState } from 'react';
import { fetchCommunities, fetchMyCommunityMemberships } from '../lib/queries';
import { Community } from '../state/models';
import { useStore } from '../state/store';

// The communities this person is in, loaded by whoever asks.
//
// This exists because the same bug happened twice. `joinedCommunities` and
// `remoteCommunities` live in the store, and for a long time the ONLY thing
// that filled them was the Community tab's own effect. Any screen reached
// without passing through that tab -- Profile > My communities, the Chat tab --
// read an empty store and told the owner of two communities they had none.
//
// One loader, used by every screen that needs the answer, rather than a copy
// per screen that the next screen forgets to make.

type RemoteRow = {
  id: string; slug?: string | null; name: string; code?: string | null;
  tint?: string | null; about?: string | null; official?: boolean | null;
  members_count?: number | null;
};

/** The store keys communities by SLUG, not by id -- see fromRemoteCommunity in
 *  CommunityScreen. Membership rows carry the uuid, so they have to be
 *  translated or every row misses. */
const fromRemote = (row: RemoteRow): Community => ({
  id: row.slug ?? row.id,
  sport: row.name,
  code: row.code ?? String(row.name ?? 'CM').slice(0, 2).toUpperCase(),
  tint: row.tint ?? '#2F3A2A',
  members: String(row.members_count ?? 0),
  about: row.about ?? '',
  official: Boolean(row.official),
});

export function useMyCommunities(): { communities: Community[]; loading: boolean } {
  const store = useStore();
  const setRemoteCommunities = useStore((state) => state.setRemoteCommunities);
  const setRemoteCommunityMemberships = useStore((state) => state.setRemoteCommunityMemberships);
  const [loading, setLoading] = useState(!store.loaded.communities);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const rows = ((await fetchCommunities()) ?? []) as RemoteRow[];
        if (!active) return;
        setRemoteCommunities(rows.map(fromRemote));
        const memberships = await fetchMyCommunityMemberships();
        if (!active) return;
        const bySlug = new Map(rows.map((row) => [row.id, row.slug ?? row.id]));
        setRemoteCommunityMemberships(memberships.flatMap((row) => {
          const key = bySlug.get(row.community_id);
          return key === undefined ? [] : [{ communityId: key, role: row.role }];
        }));
      } catch {
        // A failed refresh leaves whatever the store already had rather than
        // emptying the list under the reader.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [setRemoteCommunities, setRemoteCommunityMemberships]);

  return {
    communities: store.communities().filter((cm) => store.joinedCommunities.includes(cm.id)),
    loading,
  };
}
