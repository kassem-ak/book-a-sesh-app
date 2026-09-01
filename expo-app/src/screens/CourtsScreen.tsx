import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ScrollAwareFab, useScrollAwareFab } from '../components/ScrollAwareFab';
import { Avatar, Card, Icon, MicroBadge, Row, StripedPlaceholder } from '../components/ui';
import { venueById, venues } from '../state/courtsData';
import { useStore } from '../state/store';
import { alpha, avatarSize, radii, spacing, useTheme } from '../theme';

type Tab = 'courts' | 'events' | 'gallery';

const TABS: [Tab, string][] = [
  ['courts', 'Courts'],
  ['events', 'Events'],
  ['gallery', 'Gallery'],
];

const TAP = { top: 8, bottom: 8, left: 8, right: 8 };

// The `sheet` layer (delta section B) and the rsvp* fields are added to the
// store by the integrator in this same round; write them loosely so this
// screen compiles either way.
type LooseSetter = { set: (key: string, value: unknown) => void };
const store = () => useStore.getState() as unknown as LooseSetter;

// Board note on the venue avatar: "Stories can be added" -> sheet: 'story'.
const openAddStory = () => store().set('sheet', 'story');

// Court / event RSVP -> seed the RSVP sheet state, then raise the sheet.
const openRsvp = (target: string) => {
  const s = store();
  s.set('rsvpTarget', target);
  s.set('rsvpType', 'Single');
  s.set('rsvpHours', 1);
  s.set('rsvpGear', false);
  s.set('rsvpCoach', false);
  s.set('sheet', 'rsvp');
};

export function CourtsScreen() {
  const [venueId, setVenueId] = useState<string | null>(null);
  const [entryTab, setEntryTab] = useState<Tab>('courts');
  if (!venueId)
    return (
      <AllCourtsView
        onOpen={(id, tab) => {
          setEntryTab(tab ?? 'courts');
          setVenueId(id);
        }}
      />
    );
  return <VenueProfile id={venueId} entryTab={entryTab} onBack={() => setVenueId(null)} />;
}

// Small 40px surface icon button shared by both headers.
function HeaderIconButton({
  icon,
  label,
  onPress,
  volt,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
  volt?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={TAP}
      style={{
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: volt ? c.volt : c.surface,
        borderColor: volt ? c.volt : c.line,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={volt ? 18 : 19} color={volt ? c.ink : c.txt} />
    </Pressable>
  );
}

// ---- ALL Courts view -------------------------------------------------------
function AllCourtsView({ onOpen }: { onOpen: (id: string, tab?: Tab) => void }) {
  const { c, t } = useTheme();
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 26 }}>
      <View style={{ paddingHorizontal: spacing.screen, paddingTop: 20 }}>
        <Row style={{ marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={[t.pageTitle, { color: c.txt }]}>Courts</Text>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>Book courts, join tournaments</Text>
          </View>
          <Row gap={9}>
            <HeaderIconButton
              icon="image"
              label="Browse venue galleries"
              onPress={() => onOpen(venues[0].id, 'gallery')}
            />
            {/* Venue registration reuses the shared registration form (handoff
                v2 section 9), opened with regKind = 'venue'. */}
            <HeaderIconButton
              icon="plus"
              label="Register a venue"
              onPress={() => useStore.getState().openRegistration('venue')}
            />
          </Row>
        </Row>

        <Row
          style={{
            backgroundColor: c.surface,
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: radii.input,
            paddingHorizontal: 14,
            paddingVertical: 13,
          }}
        >
          <Text style={[t.label, { color: c.txt, flex: 1 }]}>All sports and hobbies</Text>
          <Icon name="chevron-down" size={18} color={c.txt3} />
        </Row>
        <Row
          style={{
            marginTop: 10,
            backgroundColor: c.surface,
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: radii.input,
            paddingHorizontal: 14,
            paddingVertical: 13,
          }}
          gap={10}
        >
          <Icon name="search" size={18} color={c.txt3} />
          <Text style={[t.body, { color: c.txt3 }]}>Search venues, courts</Text>
        </Row>

        <View style={{ marginTop: 16, gap: spacing.listGap }}>
          {venues.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => onOpen(v.id)}
              accessibilityRole="button"
              accessibilityLabel={
                v.name + ', ' + v.city + ' ' + v.sport + ', ' + v.distance + ' away, ' + (v.open ? 'open' : 'closed')
              }
            >
              <Card style={{ padding: 11 }}>
                <StripedPlaceholder caption={v.photo ?? 'venue photo'} height={126} />
                <Row style={{ marginTop: 11, paddingHorizontal: 4, paddingBottom: 3 }} gap={10}>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.name, { color: c.txt }]}>{v.name}</Text>
                    {/* v2 meta format: "City · Sport" */}
                    <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>
                      {v.city} · {v.sport}
                    </Text>
                  </View>
                  {/* v2: distance AND open state */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[t.priceSm, { color: c.accent }]}>{v.distance}</Text>
                    <Text style={[t.caption, { color: v.open ? c.txt2 : c.txt3, marginTop: 2 }]}>
                      {v.open ? 'OPEN' : 'CLOSED'}
                    </Text>
                  </View>
                </Row>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ---- Venue profile ---------------------------------------------------------
function VenueProfile({ id, entryTab, onBack }: { id: string; entryTab: Tab; onBack: () => void }) {
  const { c, t } = useTheme();
  const v = venueById(id);
  const [tab, setTab] = useState<Tab>(entryTab);
  const [shown, setShown] = useState(6);
  const { anim, onScroll, visible } = useScrollAwareFab();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 26 }} onScroll={onScroll} scrollEventThrottle={16}>
        {/* v2 top bar: back · "Courts" · gallery icon · volt + */}
        <Row style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }} gap={10}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to courts"
            hitSlop={TAP}
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: c.surface,
              borderColor: c.line,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevron-left" size={20} color={c.txt} />
          </Pressable>
          <Text style={[t.overlayTitle, { color: c.txt, flex: 1 }]}>Courts</Text>
          <HeaderIconButton icon="image" label="Open the gallery tab" onPress={() => setTab('gallery')} />
          <HeaderIconButton icon="plus" label={'Add a story to ' + v.name} onPress={openAddStory} volt />
        </Row>

        <StripedPlaceholder caption={v.coverPhoto ?? 'venue hero'} height={176} radius={0} />

        <View style={{ paddingHorizontal: spacing.screen }}>
          {/* Story ring + "Add story" affordance -> sheet: 'story' */}
          <Row style={{ marginTop: -30, alignItems: 'flex-end' }} gap={12}>
            <Pressable
              onPress={openAddStory}
              accessibilityRole="button"
              accessibilityLabel={'Add a story to ' + v.name}
              style={{
                width: avatarSize.venue,
                height: avatarSize.venue,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: c.volt,
                backgroundColor: c.surface2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar initials={v.code} size={58} radius={radii.avatar} bg={v.tint} fontSize={17} />
              <View
                style={{
                  position: 'absolute',
                  bottom: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  backgroundColor: c.volt,
                  borderWidth: 2,
                  borderColor: c.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="plus" size={11} color={c.ink} />
              </View>
            </Pressable>
            <Pressable
              onPress={openAddStory}
              accessibilityRole="button"
              accessibilityLabel="Add story"
              hitSlop={TAP}
              style={{ flex: 1, minHeight: 44, justifyContent: 'flex-end', paddingBottom: 4 }}
            >
              <Text style={[t.labelSm, { fontSize: 11, color: c.txt3 }]}>Add story</Text>
            </Pressable>
          </Row>

          <Row style={{ marginTop: 14, alignItems: 'flex-start' }} gap={10}>
            <View style={{ flex: 1 }}>
              <Text style={[t.overlayTitle, { fontSize: 22, color: c.txt }]}>{v.name}</Text>
              <Text style={[t.bodySm, { color: c.soft, marginTop: 6 }]}>Open : {v.days}</Text>
              <Text style={[t.bodySm, { color: c.soft, marginTop: 2 }]}>Operation hours : {v.hours}</Text>
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{v.city}</Text>
            </View>
            <MicroBadge
              label={v.open ? 'OPEN' : 'CLOSED'}
              bg={v.open ? alpha(c.volt, 0.12) : alpha(c.danger, 0.12)}
              fg={v.open ? c.accent : c.danger}
            />
          </Row>

          {/* Divided tabs: Courts | Events | Gallery */}
          <Row style={{ justifyContent: 'center', marginTop: 20, marginBottom: 18 }}>
            {TABS.map(([k, label], i) => (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                accessibilityRole="tab"
                accessibilityLabel={label + ' tab'}
                accessibilityState={{ selected: tab === k }}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: 24,
                  borderRightWidth: i < TABS.length - 1 ? 1 : 0,
                  borderRightColor: c.line,
                  borderBottomWidth: 2,
                  borderBottomColor: tab === k ? c.volt : 'transparent',
                }}
              >
                <Text style={[t.labelSm, { fontSize: 13.5, color: tab === k ? c.txt : c.txt3 }]}>{label}</Text>
              </Pressable>
            ))}
          </Row>

          {tab === 'courts' && (
            <View style={{ gap: spacing.listGap }}>
              {v.courts.map((court) => (
                <Card key={court.id} style={{ padding: 11 }}>
                  <StripedPlaceholder caption={court.photo ?? 'court photo'} height={112} />
                  <Row style={{ marginTop: 11, paddingHorizontal: 4, paddingBottom: 3 }} gap={10}>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.sectionHeading, { fontSize: 13, letterSpacing: 0.4, color: c.txt }]}>
                        {court.name}
                      </Text>
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{court.players}</Text>
                    </View>
                    <Text style={[t.price, { fontSize: 16, color: c.accent }]}>{court.price}</Text>
                    <RsvpButton target={court.name} />
                  </Row>
                </Card>
              ))}
            </View>
          )}

          {tab === 'events' && (
            <View style={{ gap: spacing.listGap }}>
              {v.events.length === 0 && (
                <Text style={[t.bodySm, { color: c.txt3 }]}>No tournaments scheduled yet.</Text>
              )}
              {v.events.map((ev) => (
                <Card key={ev.id} style={{ padding: 11 }}>
                  <View>
                    <StripedPlaceholder caption={ev.photo ?? 'event photo'} height={112} />
                    <View style={{ position: 'absolute', top: 8, left: 8 }}>
                      <MicroBadge label="Tournament" bg={alpha(c.bg, 0.72)} fg={c.volt} />
                    </View>
                  </View>
                  <Row style={{ marginTop: 11, paddingHorizontal: 4, paddingBottom: 3 }} gap={10}>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.sectionHeading, { fontSize: 13, letterSpacing: 0.4, color: c.txt }]}>
                        {ev.title}
                      </Text>
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{ev.dates}</Text>
                    </View>
                    <Text style={[t.priceSm, { color: c.accent }]}>{ev.price}</Text>
                    <RsvpButton target={ev.title} />
                  </Row>
                </Card>
              ))}
            </View>
          )}

          {tab === 'gallery' && (
            <View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
                {v.albums.slice(0, shown).map((a) => (
                  <View key={a} style={{ width: '31.5%' }}>
                    <StripedPlaceholder caption={a} height={92} />
                    <Text style={[t.caption, { color: c.txt2, marginTop: 6, textAlign: 'center' }]}>{a}</Text>
                  </View>
                ))}
              </View>
              {shown < v.albums.length && (
                <Pressable
                  onPress={() => setShown(shown + 6)}
                  accessibilityRole="button"
                  accessibilityLabel="Load more albums"
                  style={{ marginTop: 20, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={[t.labelSm, { color: c.txt2 }]}>Load More</Text>
                  <Icon name="chevron-down" size={18} color={c.txt3} />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {tab === 'gallery' ? (
        <ScrollAwareFab anim={anim} visible={visible} icon="image" label="Add photo to gallery" />
      ) : null}
    </View>
  );
}

function RsvpButton({ target }: { target: string }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={() => openRsvp(target)}
      accessibilityRole="button"
      accessibilityLabel={'RSVP for ' + target}
      hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
      style={{
        borderRadius: radii.pill,
        backgroundColor: c.volt,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text style={[t.microBadge, { fontSize: 12, letterSpacing: 0.3, color: c.ink }]}>RSVP</Text>
    </Pressable>
  );
}
