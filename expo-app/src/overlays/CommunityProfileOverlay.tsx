import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OverlayHeader } from '../components/Overlay';
import { ScrollAwareFab, useScrollAwareFab } from '../components/ScrollAwareFab';
import { Avatar, Card, Icon, MicroBadge, Row, StripedPlaceholder } from '../components/ui';
import { isMeetup } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// Spec section 5, "Community profile": identity block with verified check,
// Official Federation badge, member count, category, bio and edit pencil, then
// News | Events | Gallery tabs. News is a post feed with a reactions row and
// pager dots; Events and Gallery both page with "Load More"; all three carry a
// volt + FAB, and Gallery's hides on scroll down (board annotation).
type Tab = 'news' | 'events' | 'gallery';

type Post = {
  id: string;
  author: string;
  initials: string;
  whenLabel: string;
  body: string;
  images: number;
  likes: number;
  comments: number;
};

const POSTS: Post[] = [
  {
    id: 'p1',
    author: 'Jordan K.',
    initials: 'JK',
    whenLabel: '2h ago',
    body: 'Sunday long run is moving to 6:30 AM while the heat lasts. Meet at the Corniche steps.',
    images: 3,
    likes: 42,
    comments: 8,
  },
  {
    id: 'p2',
    author: 'Rima Haddad',
    initials: 'RH',
    whenLabel: 'Yesterday',
    body: 'Race kits arrived for everyone signed up to the 10k time trial. Grab yours at the clubhouse.',
    images: 2,
    likes: 65,
    comments: 14,
  },
];

export function CommunityProfileOverlay() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStore();
  const cm = s.communityById(s.communityId);
  const events = s.allEvents().filter((e) => e.communityId === cm.id);
  const canManage = s.canModerateCommunity(cm.id);

  const [tab, setTab] = useState<Tab>('news');
  const [shownEvents, setShownEvents] = useState(3);
  const [shownAlbums, setShownAlbums] = useState(6);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const { anim, onScroll, visible } = useScrollAwareFab();

  const albums = Array.from({ length: 12 }, (_, i) => `Album ${i + 1}`);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <OverlayHeader title="Community" onBack={s.closeOverlay} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* identity block */}
        <View style={{ paddingHorizontal: 18 }}>
          <Row gap={14} style={{ alignItems: 'flex-start' }}>
            {/* logo doubles as a story ring — board note "Stories can be added" */}
            <View style={{ width: 74, height: 74, borderRadius: 999, borderWidth: 2, borderColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
              <Avatar initials={cm.code} size={64} radius={999} bg={cm.tint} fontSize={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Row gap={7}>
                <Text style={[t.overlayTitle, { color: c.txt }]}>{cm.sport}</Text>
                <Icon name="check-circle" size={16} color={c.accent} />
              </Row>
              {cm.official && (
                <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                  <MicroBadge label="Official Federation" bg={alpha(c.volt, 0.14)} fg={c.accent} />
                </View>
              )}
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 6 }]}>{cm.members} members</Text>
              <Text style={[t.caption, { color: c.accent, marginTop: 2 }]}>Sports · {cm.sport}</Text>
            </View>
            {canManage && (
              <Pressable
                onPress={() => s.openEditCommunity()}
                accessibilityRole="button"
                accessibilityLabel="Edit community details"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="edit-2" size={18} color={c.txt2} />
              </Pressable>
            )}
          </Row>

          <Text style={[t.bodySm, { color: c.txt2, marginTop: 14, lineHeight: 20 }]}>{cm.about}</Text>

          {/* tabs */}
          <Row style={{ marginTop: 18, borderBottomColor: c.line, borderBottomWidth: 1 }} gap={22}>
            {(['news', 'events', 'gallery'] as Tab[]).map((k) => (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === k }}
                style={{ paddingBottom: 10, paddingTop: 4 }}
              >
                <Text style={[t.labelSm, { color: tab === k ? c.accent : c.txt2, textTransform: 'capitalize' }]}>{k}</Text>
              </Pressable>
            ))}
          </Row>

          {/* NEWS — post feed with reactions row and pager dots */}
          {tab === 'news' && (
            <View style={{ marginTop: 14, gap: 12 }}>
              {POSTS.map((post) => (
                <Card key={post.id} style={{ padding: 12 }}>
                  <Row gap={11}>
                    <Avatar initials={post.initials} size={38} radius={11} fontSize={13} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.labelSm, { color: c.txt }]}>{post.author}</Text>
                      <Text style={[t.caption, { color: c.txt3, marginTop: 1 }]}>{post.whenLabel}</Text>
                    </View>
                  </Row>
                  <Text style={[t.bodySm, { color: c.soft, marginTop: 10 }]}>{post.body}</Text>

                  <View style={{ marginTop: 10 }}>
                    <StripedPlaceholder caption="post image" height={150} />
                  </View>
                  {/* pager dots */}
                  <Row style={{ justifyContent: 'center', marginTop: 8 }} gap={5}>
                    {Array.from({ length: post.images }).map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: i === 0 ? 16 : 5,
                          height: 5,
                          borderRadius: 999,
                          backgroundColor: i === 0 ? c.volt : c.mono,
                        }}
                      />
                    ))}
                  </Row>

                  {/* reactions row */}
                  <Row style={{ marginTop: 12 }} gap={18}>
                    <Pressable
                      onPress={() => setLiked({ ...liked, [post.id]: !liked[post.id] })}
                      accessibilityRole="button"
                      accessibilityLabel={liked[post.id] ? 'Remove like' : 'Like post'}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Row gap={6}>
                        <Icon name="heart" size={17} color={liked[post.id] ? c.accent : c.txt2} />
                        <Text style={[t.caption, { color: liked[post.id] ? c.accent : c.txt2 }]}>
                          {post.likes + (liked[post.id] ? 1 : 0)}
                        </Text>
                      </Row>
                    </Pressable>
                    <Row gap={6}>
                      <Icon name="message-circle" size={17} color={c.txt2} />
                      <Text style={[t.caption, { color: c.txt2 }]}>{post.comments}</Text>
                    </Row>
                    <Row gap={6}>
                      <Icon name="share-2" size={17} color={c.txt2} />
                    </Row>
                  </Row>
                </Card>
              ))}
            </View>
          )}

          {/* EVENTS — cards + Load More */}
          {tab === 'events' && (
            <View style={{ marginTop: 14, gap: 12 }}>
              {events.length === 0 && (
                <Text style={[t.bodySm, { color: c.txt3, marginTop: 8 }]}>No events scheduled yet.</Text>
              )}
              {events.slice(0, shownEvents).map((ev) => (
                <Card key={ev.id} onPress={() => s.openEvent(ev.id, 'communityProfile')} style={{ padding: 12 }}>
                  <StripedPlaceholder caption={isMeetup(ev) ? 'meetup image' : 'event image'} height={110} />
                  <View style={{ marginTop: 10 }}>
                    <MicroBadge
                      label={ev.type}
                      bg={isMeetup(ev) ? alpha(c.volt, 0.12) : alpha(c.amber, 0.2)}
                      fg={isMeetup(ev) ? c.accent : c.amberText}
                    />
                  </View>
                  <Text style={[t.name, { color: c.txt, marginTop: 8 }]}>{ev.title}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{ev.whenLabel} · {ev.loc}</Text>
                  <Text style={[t.caption, { color: c.txt3, marginTop: 4 }]}>{ev.attendees} going</Text>
                </Card>
              ))}
              {shownEvents < events.length && (
                <Pressable
                  onPress={() => setShownEvents(shownEvents + 3)}
                  accessibilityRole="button"
                  accessibilityLabel="Load more events"
                  style={{ alignItems: 'center', paddingVertical: 10 }}
                >
                  <Text style={[t.labelSm, { color: c.txt2 }]}>Load More</Text>
                  <Icon name="chevron-down" size={18} color={c.txt3} />
                </Pressable>
              )}
            </View>
          )}

          {/* GALLERY — album grid + Load More */}
          {tab === 'gallery' && (
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
                {albums.slice(0, shownAlbums).map((a) => (
                  <View key={a} style={{ width: '48.5%' }}>
                    <StripedPlaceholder caption={a} height={104} />
                    <Text style={[t.caption, { color: c.txt2, marginTop: 6 }]}>{a}</Text>
                  </View>
                ))}
              </View>
              {shownAlbums < albums.length && (
                <Pressable
                  onPress={() => setShownAlbums(shownAlbums + 6)}
                  accessibilityRole="button"
                  accessibilityLabel="Load more albums"
                  style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}
                >
                  <Text style={[t.labelSm, { color: c.txt2 }]}>Load More</Text>
                  <Icon name="chevron-down" size={18} color={c.txt3} />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* volt + FAB on every tab; the Gallery one hides while scrolling down */}
      {canManage && (
        <ScrollAwareFab
          anim={tab === 'gallery' ? anim : undefined}
          visible={tab === 'gallery' ? visible : true}
          icon={tab === 'gallery' ? 'image' : tab === 'events' ? 'calendar' : 'edit-3'}
          label={tab === 'gallery' ? 'Add photo' : tab === 'events' ? 'Create event' : 'Write a post'}
          onPress={tab === 'events' ? () => s.openCreateEvent() : undefined}
        />
      )}
    </View>
  );
}
