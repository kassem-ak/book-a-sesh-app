import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, MicroBadge, Row, SectionHeading } from '../components/ui';
import { fetchCommunities, fetchMyCommunityMemberships } from '../lib/queries';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

type RemoteRow = {
  id: string; slug?: string | null; name: string; code?: string | null;
  tint?: string | null; about?: string | null; official?: boolean | null;
  members_count?: number | null;
};

// The same shape CommunityScreen builds. Kept in step by hand, which is the
// cost of the store keying communities by slug rather than by id.
const fromRemote = (row: RemoteRow) => ({
  id: row.slug ?? row.id,
  sport: row.name,
  code: row.code ?? String(row.name ?? 'CM').slice(0, 2).toUpperCase(),
  tint: row.tint ?? '#2F3A2A',
  members: String(row.members_count ?? 0),
  about: row.about ?? '',
  official: Boolean(row.official),
});

// currentCommunityRole() returns ADMIN | MODERATOR | MEMBER, so key on that.
const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
};

// "My Communities" — the crews the signed-in user owns, moderates or follows.
export function MyCommunitiesOverlay() {
  const { c, t } = useTheme();
  const s = useStore();

  // This screen used to read `joinedCommunities` and `remoteCommunities`
  // straight from the store, and NOTHING here filled them -- only the
  // Community tab's own effect does. Opening Profile > My communities without
  // visiting that tab first therefore told the owner of two communities that
  // they had not joined any. A screen has to load what it shows.
  const setRemoteCommunities = useStore((state) => state.setRemoteCommunities);
  const setRemoteCommunityMemberships = useStore((state) => state.setRemoteCommunityMemberships);
  const [loading, setLoading] = useState(!s.loaded.communities);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const rows = (await fetchCommunities()) ?? [];
        if (!active) return;
        setRemoteCommunities(rows.map(fromRemote));
        const memberships = await fetchMyCommunityMemberships();
        if (!active) return;
        // The store keys communities by slug, not by id -- see
        // fromRemoteCommunity in CommunityScreen. Membership rows carry the
        // uuid, so they have to be translated or every row misses.
        const bySlug = new Map(rows.map((row: RemoteRow) => [row.id, row.slug ?? row.id]));
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

  const all = s.communities();
  const mine = all.filter((cm) => s.joinedCommunities.includes(cm.id));
  const managed = mine.filter((cm) => s.canModerateCommunity(cm.id));
  const following = mine.filter((cm) => !s.canModerateCommunity(cm.id));

  return (
    <OverlayScaffold header={<OverlayHeader title="My Communities" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {loading && mine.length === 0 && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3, marginTop: 20 }]}>
            Loading your communities…
          </Text>
        )}
        {!loading && mine.length === 0 && (
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 20 }]}>
            You have not joined a community yet. Join one from the Community tab and it shows up here.
          </Text>
        )}

        {managed.length > 0 && (
          <>
            <SectionHeading style={{ marginBottom: 11 }}>Managing</SectionHeading>
            <View style={{ gap: 11 }}>
              {managed.map((cm) => (
                <CommunityRow key={cm.id} cm={cm} role={s.currentCommunityRole(cm.id)} onOpen={() => s.openCommunity(cm.id)} />
              ))}
            </View>
          </>
        )}

        {following.length > 0 && (
          <>
            <SectionHeading style={{ marginTop: managed.length ? 22 : 0, marginBottom: 11 }}>Following</SectionHeading>
            <View style={{ gap: 11 }}>
              {following.map((cm) => (
                <CommunityRow key={cm.id} cm={cm} role={s.currentCommunityRole(cm.id)} onOpen={() => s.openCommunity(cm.id)} />
              ))}
            </View>
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}

function CommunityRow({
  cm,
  role,
  onOpen,
}: {
  cm: { id: string; sport: string; code: string; tint: string; members: string; official: boolean };
  role: string;
  onOpen: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Card onPress={onOpen}>
      <Row style={{ padding: 14 }} gap={12}>
        <Avatar initials={cm.code} bg={cm.tint} />
        <View style={{ flex: 1 }}>
          <Row gap={8}>
            <Text style={[t.name, { color: c.txt }]}>{cm.sport}</Text>
            {cm.official && <MicroBadge label="Official" bg={alpha(c.volt, 0.14)} fg={c.accent} />}
          </Row>
          <Text style={[t.caption, { color: c.txt3, marginTop: 3 }]}>{cm.members} members</Text>
        </View>
        <MicroBadge
          label={ROLE_LABEL[role] ?? 'Member'}
          bg={role === 'MEMBER' ? c.surface2 : alpha(c.volt, 0.14)}
          fg={role === 'MEMBER' ? c.txt2 : c.accent}
        />
      </Row>
    </Card>
  );
}
