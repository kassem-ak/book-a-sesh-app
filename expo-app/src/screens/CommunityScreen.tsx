import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, StripedPlaceholder } from '../components/ui';
import { Community, CommunityRole, EventItem, isMeetup } from '../state/models';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function CommunityScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const adHidden = s.adsHidden['community'];
  const ad = D.ads.community;
  const soon = s.allEvents().slice(0, 6);
  const communities = s.communities();

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[t.bodySm, { color: c.txt3 }]}>Train with people nearby</Text>
          <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Community</Text>
        </View>
        <Pressable onPress={s.openStartCommunity} style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
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
                <Pressable onPress={() => s.set('adsHidden', { ...s.adsHidden, community: true })} style={{ marginLeft: 8 }}>
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
          <CommunityCard key={cm.id} cm={cm} joined={s.joinedCommunities.includes(cm.id)} role={s.currentCommunityRole(cm.id)} onOpen={() => s.openCommunity(cm.id)} onToggle={() => s.toggleCommunity(cm.id)} />
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
