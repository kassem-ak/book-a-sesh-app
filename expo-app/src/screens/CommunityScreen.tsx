import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Avatar, Button, Card, ErrorNote, Icon, MicroBadge, Note, Row, SectionHeading, StatusLine,
  StripedPlaceholder,
} from '../components/ui';
import { Community, CommunityRole, EventItem, EventSuggestion } from '../state/models';
import { fetchCommunities, fetchEvents, fetchEventSuggestions, fetchMyCommunityMemberships } from '../lib/queries';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

type RemoteCommunity = {
  id: string;
  slug?: string | null;
  name: string;
  code?: string | null;
  tint?: string | null;
  about?: string | null;
  official?: boolean | null;
  members_count?: number | null;
};

const memberLabel = (count?: number | null) => {
  const n = count ?? 0;
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
};


type RelatedSlug = { slug?: string | null } | { slug?: string | null }[] | null;
type RelatedName = { name?: string | null } | { name?: string | null }[] | null;

type RemoteEvent = {
  id: string;
  community_id?: string | null;
  subgroup_id?: string | null;
  type?: string | null;
  title: string;
  starts_at?: string | null;
  when_label?: string | null;
  location?: string | null;
  attendees_count?: number | null;
  community?: RelatedSlug;
  host?: RelatedName;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

const fromRemoteEvent = (row: RemoteEvent): EventItem => ({
  id: row.id,
  communityId: firstRelated(row.community)?.slug ?? row.community_id ?? '',
  subId: row.subgroup_id ?? null,
  type: row.type === 'event' ? 'Event' : 'Meetup',
  title: row.title,
  whenLabel: row.when_label ?? 'Upcoming',
  loc: row.location ?? 'TBD',
  attendees: row.attendees_count ?? 0,
  host: firstRelated(row.host)?.name ?? 'Community host',
});

type RemoteSuggestion = {
  id: string;
  community_id?: string | null;
  type?: string | null;
  title: string;
  when_label?: string | null;
  location?: string | null;
  status?: string | null;
  community?: RelatedSlug;
  requester?: RelatedName;
};

const fromRemoteSuggestion = (row: RemoteSuggestion): EventSuggestion => ({
  id: row.id,
  communityId: firstRelated(row.community)?.slug ?? row.community_id ?? '',
  type: row.type === 'event' ? 'Event' : 'Meetup',
  title: row.title,
  whenLabel: row.when_label ?? 'Upcoming',
  loc: row.location ?? 'TBD',
  requestedBy: firstRelated(row.requester)?.name ?? 'Member',
  status: row.status === 'approved' ? 'APPROVED' : 'PENDING',
});
const fromRemoteCommunity = (row: RemoteCommunity): Community => ({
  id: row.slug ?? row.id,
  sport: row.name,
  code: row.code ?? row.name.slice(0, 2).toUpperCase(),
  tint: row.tint ?? '#2F3A2A',
  members: memberLabel(row.members_count),
  about: row.about ?? '',
  official: Boolean(row.official),
});
export function CommunityScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const setRemoteCommunities = useStore((state) => state.setRemoteCommunities);
  const setRemoteCommunityMemberships = useStore((state) => state.setRemoteCommunityMemberships);
  const setRemoteEvents = useStore((state) => state.setRemoteEvents);
  const setRemoteEventSuggestions = useStore((state) => state.setRemoteEventSuggestions);
  const soon = s.allEvents().slice(0, 6);
  const communities = s.communities();
  const hasCrews = s.joinedCommunities.length > 0;
  // `loaded` tells "the fetch has not finished" from "the server has none";
  // neither list falls back to invented rows any more.
  const loaded = s.loaded;
  // An empty list and a failed fetch look identical in the store, so the
  // failure has to be remembered here or the screen lies about being empty.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    fetchCommunities()
      .then(async (rows) => {
        if (!active) return;
        const communities = (rows ?? []) as RemoteCommunity[];
        setRemoteCommunities(communities.map(fromRemoteCommunity));
        try {
          const memberships = await fetchMyCommunityMemberships();
          if (!active) return;
          // Store keys match fromRemoteCommunity, not the membership's UUID.
          const communityIds = new Map(communities.map((row) => [row.id, row.slug ?? row.id]));
          setRemoteCommunityMemberships(memberships.flatMap((row) => {
            const communityId = communityIds.get(row.community_id);
            return communityId === undefined ? [] : [{ communityId, role: row.role }];
          }));
        } catch {
          /* A failed refresh must not erase memberships already in the store. */
        }
      })
      .catch(() => {
        if (active) { setRemoteCommunities([]); setLoadError('Could not load communities.'); }
      });
    fetchEvents()
      .then((rows) => {
        if (active) setRemoteEvents(Array.isArray(rows) ? rows.map((row) => fromRemoteEvent(row as RemoteEvent)) : []);
      })
      .catch(() => {
        if (active) { setRemoteEvents([]); setLoadError('Could not load events.'); }
      });
    fetchEventSuggestions()
      .then((rows) => {
        if (active) setRemoteEventSuggestions(Array.isArray(rows) ? rows.map((row) => fromRemoteSuggestion(row as RemoteSuggestion)) : []);
      })
      .catch(() => {
        if (active) setRemoteEventSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, [s.authEmail, reloads, setRemoteCommunities, setRemoteCommunityMemberships, setRemoteEvents, setRemoteEventSuggestions]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 }}>
      {loadError && (
        <View style={{ marginBottom: 14 }}>
          <ErrorNote message={loadError} retryLabel="Retry loading the community lists"
            onRetry={() => setReloads((n: number) => n + 1)} />
        </View>
      )}
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={[t.pageTitle, { color: c.txt }]}>Community</Text>
        </View>
        {/* Board annotation: "My Communities" icon sits beside the volt +.
            Delta section D → Community: it shows a volt dot when you have crews. */}
        <Pressable
          onPress={() => s.set('overlay', 'myCommunities')}
          accessibilityRole="button"
          accessibilityLabel={hasCrews ? `My communities, ${s.joinedCommunities.length} joined` : 'My communities'}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}
        >
          <Icon name="users" size={26} color={c.accent} />
          {hasCrews && (
            <View
              style={{
                position: 'absolute',
                top: 12,
                right: 13,
                width: 9,
                height: 9,
                borderRadius: 999,
                backgroundColor: c.volt,
                borderColor: c.surface,
                borderWidth: 1.5,
              }}
            />
          )}
        </Pressable>
        <Pressable onPress={s.openStartCommunity} accessibilityRole="button" accessibilityLabel="Start a community" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={24} color={c.ink} />
        </Pressable>
      </Row>
      <Text style={[t.bodySm, { color: c.txt2, marginTop: 14 }]}>Train with crews around you</Text>

      <SectionHeading style={{ marginTop: 34, marginBottom: 11 }}>Happening soon</SectionHeading>
      {soon.length === 0 ? (
        <StatusLine>{loaded.events ? 'No events scheduled yet.' : 'Loading events…'}</StatusLine>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
          {soon.map((ev) => (
            <EventCard key={ev.id} ev={ev} onPress={() => s.openEvent(ev.id, null)} />
          ))}
        </ScrollView>
      )}

      <Row style={{ marginTop: 34, marginBottom: 11, justifyContent: 'space-between' }}>
        <SectionHeading>Communities</SectionHeading>
        <Button label="Request a sport" icon="plus" onPress={s.openRequest} />
      </Row>
      {communities.length === 0 && (
        <StatusLine>{loaded.communities ? 'No communities yet.' : 'Loading communities…'}</StatusLine>
      )}
      <View style={{ gap: 11 }}>
        {communities.map((cm) => (
          <CommunityCard key={cm.id} cm={cm} joined={s.joinedCommunities.includes(cm.id)} role={s.currentCommunityRole(cm.id)} onOpen={() => { s.set('communityId', cm.id); s.set('overlay', 'communityProfile'); }} onToggle={() => s.toggleCommunity(cm.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

function EventCard({ ev, onPress }: { ev: EventItem; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={ev.title} style={{ width: 216 }}>
      <Card style={{ padding: 12 }}>
        <View>
          <StripedPlaceholder caption="" height={72} />
          <View style={{ position: 'absolute', top: 10, left: 10 }}>
            <MicroBadge label={ev.type} bg={alpha(c.volt, 0.16)} fg={c.accent} />
          </View>
        </View>
        <Text style={[t.name, { color: c.txt, marginTop: 8 }]} numberOfLines={1}>{ev.title}</Text>
        <Text style={[t.labelSm, { color: c.txt2, marginTop: 4 }]} numberOfLines={1}>{ev.whenLabel}</Text>
        <Text style={[t.caption, { color: c.txt3, marginTop: 5 }]} numberOfLines={1}>{ev.loc} · {ev.attendees} going</Text>
      </Card>
    </Pressable>
  );
}

const roleLabel: Record<CommunityRole, string> = { ADMIN: 'Admin', MODERATOR: 'Moderator', MEMBER: 'Member' };

function CommunityCard({ cm, joined, role, onOpen, onToggle }: { cm: Community; joined: boolean; role: CommunityRole; onOpen: () => void; onToggle: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card onPress={onOpen}>
      <Row style={{ padding: 14 }} gap={12}>
        <Avatar initials={cm.code} size={52} radius={14} bg={cm.tint} />
        <View style={{ flex: 1 }}>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <Text style={[t.name, { color: c.txt }]}>{cm.sport}</Text>
            {cm.official && <MicroBadge label="Official" bg={alpha(c.volt, 0.14)} fg={c.accent} />}
            {joined && <MicroBadge label={roleLabel[role]} bg={role === 'MEMBER' ? c.surface2 : alpha(c.amber, 0.2)} fg={role === 'MEMBER' ? c.txt2 : c.amberText} />}
          </Row>
          <Text style={[t.caption, { color: c.accent, marginTop: 4 }]}>{cm.members} members</Text>
          <Text style={[t.caption, { color: c.txt3, marginTop: 2 }]} numberOfLines={1}>{cm.about}</Text>
        </View>
        <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel={`${joined ? 'Leave' : 'Join'} ${cm.sport}`} style={{ minHeight: 44, justifyContent: 'center', borderRadius: 999, borderColor: c.line, borderWidth: 1, backgroundColor: joined ? 'transparent' : c.volt, paddingHorizontal: 16, paddingVertical: 9 }}>
          <Text style={[t.labelSm, { color: joined ? c.txt2 : c.ink }]}>{joined ? 'Joined' : 'Join'}</Text>
        </Pressable>
      </Row>
    </Card>
  );
}
