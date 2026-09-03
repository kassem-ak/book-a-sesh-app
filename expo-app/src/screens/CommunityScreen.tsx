import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, StripedPlaceholder } from '../components/ui';
import { Community, CommunityRole, EventItem, EventSuggestion, isMeetup } from '../state/models';
import * as D from '../state/sampleData';
import { fetchCommunities, fetchEvents, fetchEventSuggestions } from '../lib/queries';
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
  communityId: firstRelated(row.community)?.slug ?? row.community_id ?? 'running',
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
  communityId: firstRelated(row.community)?.slug ?? row.community_id ?? 'running',
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
  const setRemoteEvents = useStore((state) => state.setRemoteEvents);
  const setRemoteEventSuggestions = useStore((state) => state.setRemoteEventSuggestions);
  const adHidden = s.adsHidden['community'];
  const ad = D.ads.community;
  const soon = s.allEvents().slice(0, 6);
  const communities = s.communities();
  const hasCrews = s.joinedCommunities.length > 0;

  useEffect(() => {
    let active = true;
    fetchCommunities()
      .then((rows) => {
        if (active && Array.isArray(rows)) setRemoteCommunities(rows.map((row) => fromRemoteCommunity(row as RemoteCommunity)));
      })
      .catch(() => {
        if (active) setRemoteCommunities([]);
      });
    fetchEvents()
      .then((rows) => {
        if (active && Array.isArray(rows)) setRemoteEvents(rows.map((row) => fromRemoteEvent(row as RemoteEvent)));
      })
      .catch(() => {
        if (active) setRemoteEvents([]);
      });
    fetchEventSuggestions()
      .then((rows) => {
        if (active && Array.isArray(rows)) setRemoteEventSuggestions(rows.map((row) => fromRemoteSuggestion(row as RemoteSuggestion)));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [setRemoteCommunities, setRemoteEvents, setRemoteEventSuggestions]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={[t.bodySm, { color: c.txt3 }]}>Train with people nearby</Text>
          <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Community</Text>
        </View>
        {/* Board annotation: "My Communities" icon sits beside the volt +.
            Delta section D → Community: it shows a volt dot when you have crews. */}
        <Pressable
          onPress={() => s.set('overlay', 'myCommunities')}
          accessibilityRole="button"
          accessibilityLabel={hasCrews ? `My communities, ${s.joinedCommunities.length} joined` : 'My communities'}
          style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}
        >
          <Icon name="users" size={22} color={c.txt2} />
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
        <Pressable onPress={s.openStartCommunity} accessibilityRole="button" accessibilityLabel="Start a community" style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={24} color={c.ink} />
        </Pressable>
      </Row>

      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Happening soon</SectionHeading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }}>
        {soon.map((ev) => (
          <EventCard key={ev.id} ev={ev} onPress={() => s.openEvent(ev.id, 'community')} />
        ))}
      </ScrollView>

      {!adHidden && (
        <Card style={{ marginTop: 22 }}>
          <Row style={{ padding: 14, alignItems: 'flex-start' }} gap={12}>
            <Avatar initials={ad.logo} size={46} radius={13} fontSize={15} bg={ad.tint} />
            <View style={{ flex: 1 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={[t.name, { color: c.txt, flex: 1 }]}>{ad.brand}</Text>
                <MicroBadge label="AD" bg={c.surface2} fg={c.txt2} />
                <Pressable onPress={() => s.set('adsHidden', { ...s.adsHidden, community: true })} accessibilityRole="button" accessibilityLabel="Dismiss ad" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ marginLeft: 8 }}>
                  <Icon name="x" size={16} color={c.txt3} />
                </Pressable>
              </Row>
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{ad.headline}</Text>
              <Text style={[t.caption, { color: c.txt3, marginTop: 6 }]}>Why this ad? {ad.why}</Text>
            </View>
          </Row>
        </Card>
      )}

      <Row style={{ marginTop: 22, marginBottom: 11, justifyContent: 'space-between' }}>
        <SectionHeading>Communities</SectionHeading>
        <Pressable onPress={s.openRequest}>
          <Text style={[t.label, { color: c.accent }]}>Request a sport</Text>
        </Pressable>
      </Row>
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
    <Pressable onPress={onPress} style={{ width: 260 }}>
      <Card style={{ padding: 12 }}>
        <StripedPlaceholder caption={isMeetup(ev) ? 'meetup image' : 'event image'} height={130} />
        <View style={{ marginTop: 12 }}>
          <MicroBadge label={ev.type} bg={isMeetup(ev) ? alpha(c.volt, 0.12) : alpha(c.amber, 0.2)} fg={isMeetup(ev) ? c.accent : c.amberText} />
        </View>
        <Text style={[t.name, { color: c.txt, marginTop: 8 }]} numberOfLines={1}>{ev.title}</Text>
        <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]} numberOfLines={1}>{ev.loc}</Text>
        <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
          <Row gap={6}>
            <Icon name="calendar" size={14} color={c.accent} />
            <Text style={[t.labelSm, { color: c.txt }]}>{ev.whenLabel}</Text>
          </Row>
          <Text style={[t.caption, { color: c.txt3 }]}>{ev.attendees} going</Text>
        </Row>
      </Card>
    </Pressable>
  );
}

const roleLabel: Record<CommunityRole, string> = { ADMIN: 'Admin', MODERATOR: 'Moderator', MEMBER: 'Member' };

function CommunityCard({ cm, joined, role, onOpen, onToggle }: { cm: Community; joined: boolean; role: CommunityRole; onOpen: () => void; onToggle: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card onPress={onOpen}>
      <Row style={{ padding: 14, alignItems: 'flex-start' }} gap={12}>
        <Avatar initials={cm.code} size={54} radius={14} bg={cm.tint} />
        <View style={{ flex: 1 }}>
          <Row gap={8}>
            <Text style={[t.name, { color: c.txt }]}>{cm.sport}</Text>
            {cm.official && <MicroBadge label="Official" bg={alpha(c.volt, 0.14)} fg={c.accent} />}
            {joined && <MicroBadge label={roleLabel[role]} bg={role === 'MEMBER' ? c.surface2 : alpha(c.amber, 0.2)} fg={role === 'MEMBER' ? c.txt2 : c.amberText} />}
          </Row>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]} numberOfLines={2}>{cm.about}</Text>
          <Row gap={5} style={{ marginTop: 6 }}>
            <Icon name="users" size={13} color={c.txt3} />
            <Text style={[t.caption, { color: c.txt3 }]}>{cm.members} members</Text>
          </Row>
        </View>
        <Pressable onPress={onToggle} style={{ borderRadius: 999, borderColor: c.line, borderWidth: 1, backgroundColor: joined ? 'transparent' : c.volt, paddingHorizontal: 16, paddingVertical: 9 }}>
          <Text style={[t.labelSm, { color: joined ? c.txt2 : c.ink }]}>{joined ? 'Joined' : 'Join'}</Text>
        </Pressable>
      </Row>
    </Card>
  );
}
