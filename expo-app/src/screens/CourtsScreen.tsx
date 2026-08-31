import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ScrollAwareFab, useScrollAwareFab } from '../components/ScrollAwareFab';
import { Avatar, Card, Icon, MicroBadge, Row, StripedPlaceholder } from '../components/ui';
import { venueById, venues } from '../state/courtsData';
import { alpha, useTheme } from '../theme';

type Tab = 'courts' | 'events' | 'gallery';

export function CourtsScreen() {
  const [venueId, setVenueId] = useState<string | null>(null);
  if (!venueId) return <AllCourtsView onOpen={setVenueId} />;
  return <VenueProfile id={venueId} onBack={() => setVenueId(null)} />;
}

function CourtsHeader({ onBack }: { onBack?: () => void }) {
  const { c, t } = useTheme();
  return (
    <Row style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-left" size={20} color={c.txt2} />
        </Pressable>
      ) : null}
      <Text style={[t.overlayTitle, { color: c.txt, flex: 1, marginLeft: onBack ? 12 : 0 }]}>Courts</Text>
      <Row gap={12}>
        <Icon name="calendar" size={20} color={c.txt2} />
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={18} color={c.ink} />
        </View>
      </Row>
    </Row>
  );
}

// ---- ALL Courts view -------------------------------------------------------
function AllCourtsView({ onOpen }: { onOpen: (id: string) => void }) {
  const { c, t } = useTheme();
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      <CourtsHeader />
      <View style={{ paddingHorizontal: 18 }}>
        <Row style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 }}>
          <Text style={[t.label, { color: c.txt, flex: 1 }]}>All sports and hobbies</Text>
          <Icon name="chevron-down" size={18} color={c.txt3} />
        </Row>
        <Row
          style={{ marginTop: 11, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 }}
          gap={10}
        >
          <Icon name="search" size={18} color={c.txt3} />
          <Text style={[t.body, { color: c.txt3 }]}>Search Coach, Mentor</Text>
        </Row>

        <View style={{ marginTop: 16, gap: 12 }}>
          {venues.map((v) => (
            <Card key={v.id} onPress={() => onOpen(v.id)} style={{ padding: 10 }}>
              <StripedPlaceholder caption="venue photo" height={104} />
              <Row style={{ marginTop: 10, paddingHorizontal: 4, paddingBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.name, { color: c.txt }]}>{v.name}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{v.city}</Text>
                </View>
                <Text style={[t.labelSm, { color: c.txt2 }]}>{v.distance}</Text>
              </Row>
            </Card>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ---- Venue profile ---------------------------------------------------------
function VenueProfile({ id, onBack }: { id: string; onBack: () => void }) {
  const { c, t } = useTheme();
  const v = venueById(id);
  const [tab, setTab] = useState<Tab>('courts');
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState(6);
  const { anim, onScroll, visible } = useScrollAwareFab();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 26 }} onScroll={onScroll} scrollEventThrottle={16}>
        <CourtsHeader onBack={onBack} />
        <StripedPlaceholder caption="venue hero" height={150} radius={0} />

        <View style={{ paddingHorizontal: 18, marginTop: -26 }}>
          {/* circular logo doubles as a story ring — board note "Stories can be added" */}
          <View style={{ width: 62, height: 62, borderRadius: 999, borderWidth: 2, borderColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Avatar initials={v.code} size={54} radius={999} bg={v.tint} fontSize={15} />
          </View>

          <Row style={{ marginTop: 12 }} gap={9}>
            <Text style={[t.overlayTitle, { color: c.txt }]}>{v.name}</Text>
            <MicroBadge label={v.status} bg={alpha(c.volt, 0.14)} fg={c.accent} />
          </Row>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>Open : {v.days}</Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>Operation hours : {v.hours}</Text>
          <Text style={[t.labelSm, { color: c.accent, marginTop: 3 }]}>{v.city}</Text>

          <Row style={{ marginTop: 16, borderBottomColor: c.line, borderBottomWidth: 1 }} gap={22}>
            {(['courts', 'events', 'gallery'] as Tab[]).map((k) => (
              <Pressable key={k} onPress={() => setTab(k)} style={{ paddingBottom: 10 }}>
                <Text style={[t.labelSm, { color: tab === k ? c.accent : c.txt2, textTransform: 'capitalize' }]}>{k}</Text>
              </Pressable>
            ))}
          </Row>

          {tab === 'courts' && (
            <View style={{ marginTop: 14, gap: 12 }}>
              {v.courts.map((court) => (
                <Card key={court.id} style={{ padding: 10 }}>
                  <StripedPlaceholder caption="court photo" height={86} />
                  <Row style={{ marginTop: 10, paddingHorizontal: 4, paddingBottom: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.labelSm, { color: c.txt }]}>{court.name}</Text>
                      <Text style={[t.caption, { color: c.txt2, marginTop: 2 }]}>{court.players}</Text>
                    </View>
                    <Text style={[t.priceSm, { color: c.accent, marginRight: 10 }]}>{court.price}</Text>
                    <RsvpButton id={court.id} done={rsvps[court.id]} onPress={() => setRsvps({ ...rsvps, [court.id]: true })} />
                  </Row>
                </Card>
              ))}
            </View>
          )}

          {tab === 'events' && (
            <View style={{ marginTop: 14, gap: 12 }}>
              {v.events.length === 0 && (
                <Text style={[t.bodySm, { color: c.txt3, marginTop: 8 }]}>No tournaments scheduled yet.</Text>
              )}
              {v.events.map((ev) => (
                <Card key={ev.id} style={{ padding: 10 }}>
                  <StripedPlaceholder caption="event photo" height={86} />
                  <Row style={{ marginTop: 10, paddingHorizontal: 4, paddingBottom: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.labelSm, { color: c.txt }]}>{ev.title}</Text>
                      <Text style={[t.caption, { color: c.txt2, marginTop: 2 }]}>{ev.dates}</Text>
                    </View>
                    <Text style={[t.priceSm, { color: c.accent, marginRight: 10 }]}>{ev.price}</Text>
                    <RsvpButton id={ev.id} done={rsvps[ev.id]} onPress={() => setRsvps({ ...rsvps, [ev.id]: true })} />
                  </Row>
                </Card>
              ))}
            </View>
          )}

          {tab === 'gallery' && (
            <View style={{ marginTop: 14 }}>
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
                  style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8 }}
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

function RsvpButton({ id, done, onPress }: { id: string; done?: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={done ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={done ? 'Reserved' : 'Reserve this slot'}
      accessibilityState={{ disabled: Boolean(done) }}
      style={{
        borderRadius: 999,
        backgroundColor: done ? c.surface2 : c.volt,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: done ? c.txt2 : c.ink }]}>
        {done ? 'RESERVED' : 'RSVP'}
      </Text>
    </Pressable>
  );
}
