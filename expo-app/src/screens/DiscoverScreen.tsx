import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Avatar,
  Card,
  Chip,
  Icon,
  MicroBadge,
  Row,
  SectionHeading,
  Segmented,
  Stars,
} from '../components/ui';
import { Person, initials, personMeta } from '../state/models';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';
import { DiscoverMap } from './DiscoverMap';

function matchesSport(p: Person, sport: string) {
  if (sport === 'All') return true;
  return p.sport.toLowerCase().includes(sport.toLowerCase());
}

export function DiscoverScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const isCoaches = s.mode === 'coaches';
  const base = (isCoaches ? D.coaches : D.partners).filter((p) => matchesSport(p, s.sport));
  const featured = base.filter((p) => p.boosted);
  const rest = base
    .filter((p) => !p.boosted)
    .sort((a, b) => {
      if (s.sortBy === 'price') return (a.price ?? 0) - (b.price ?? 0);
      if (s.sortBy === 'distance') return a.distance - b.distance;
      return b.rating - a.rating;
    });
  const adHidden = s.adsHidden['discover'];
  const ad = D.ads.discover;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 }}>
      {/* header */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[t.bodySm, { color: c.txt3 }]}>Hey Alex —</Text>
          <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Find your coach or partner</Text>
          <Row style={{ marginTop: 8 }} gap={5}>
            <Icon name="map-pin" size={13} color={c.accent} />
            <Text style={[t.bodySm, { color: c.txt2 }]}>Beirut, Lebanon</Text>
          </Row>
        </View>
        <Pressable
          onPress={s.openNotifs}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="bell" size={20} color={c.txt2} />
          {!s.notifSeen && (
            <View style={{ position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: c.volt }} />
          )}
        </Pressable>
      </Row>

      {/* search */}
      <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, gap: 10 }}>
        <Icon name="search" size={18} color={c.txt3} />
        <Text style={[t.body, { color: c.txt3 }]}>Search sports, hobbies, coaches…</Text>
      </View>

      {/* coaches | partners */}
      <View style={{ marginTop: 12 }}>
        <Segmented
          options={[
            { key: 'coaches', label: 'Coaches' },
            { key: 'partners', label: 'Training partners' },
          ]}
          selected={s.mode}
          onSelect={(k) => s.set('mode', k)}
        />
      </View>

      {/* sport filter */}
      <Pressable
        onPress={() => s.set('sportMenu', !s.sportMenu)}
        style={{ marginTop: 11, flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 }}
      >
        <Icon name="sliders" size={16} color={c.txt2} />
        <Text style={[t.label, { color: c.txt, flex: 1, marginLeft: 10 }]}>
          {s.sport === 'All' ? 'All sports & hobbies' : s.sport}
        </Text>
        <Icon name={s.sportMenu ? 'chevron-up' : 'chevron-down'} size={18} color={c.txt3} />
      </Pressable>
      {s.sportMenu && (
        <Card style={{ marginTop: 8, padding: 6 }}>
          {D.sportNames.map((sp) => (
            <Pressable
              key={sp}
              onPress={() => {
                s.set('sport', sp);
                s.set('sportMenu', false);
              }}
              style={{ paddingVertical: 11, paddingHorizontal: 10, borderRadius: 10, backgroundColor: s.sport === sp ? alpha(c.volt, 0.1) : 'transparent' }}
            >
              <Text style={[t.label, { color: s.sport === sp ? c.accent : c.txt }]}>{sp === 'All' ? 'All sports & hobbies' : sp}</Text>
            </Pressable>
          ))}
          <Pressable onPress={s.openRequest} style={{ paddingVertical: 11, paddingHorizontal: 10, borderTopColor: c.line2, borderTopWidth: 1, marginTop: 4 }}>
            <Text style={[t.label, { color: c.accent }]}>Request a sport or hobby</Text>
          </Pressable>
        </Card>
      )}

      {/* cards | map */}
      <View style={{ marginTop: 11 }}>
        <Segmented
          options={[
            { key: 'cards', label: 'Cards' },
            { key: 'map', label: 'Map' },
          ]}
          selected={s.discoverView}
          onSelect={(k) => s.set('discoverView', k)}
        />
      </View>

      {s.discoverView === 'map' ? (
        <View style={{ marginTop: 14 }}>
          <DiscoverMap people={[...featured, ...rest]} />
        </View>
      ) : (
        <>
          {featured.length > 0 && (
            <>
              <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Featured {isCoaches ? 'coaches' : 'partners'}</SectionHeading>
              <View style={{ gap: 11 }}>
                {featured.map((p) => (
                  <BoostedCard key={p.id} p={p} onPress={() => s.openPerson(p.id)} />
                ))}
              </View>
            </>
          )}

          {!adHidden && (
            <Pressable onPress={() => {}} style={{ marginTop: 11 }}>
              <Card>
                <Row style={{ padding: 14, alignItems: 'flex-start' }} gap={12}>
                  <Avatar initials={ad.logo} size={46} radius={13} fontSize={15} bg={ad.tint} />
                  <View style={{ flex: 1 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={[t.name, { color: c.txt, flex: 1 }]}>{ad.brand}</Text>
                      <MicroBadge label="AD" bg={c.surface2} fg={c.txt2} />
                      <Pressable onPress={() => s.set('adsHidden', { ...s.adsHidden, discover: true })} style={{ marginLeft: 8 }}>
                        <Icon name="x" size={16} color={c.txt3} />
                      </Pressable>
                    </Row>
                    <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{ad.headline}</Text>
                    <Text style={[t.caption, { color: c.txt3, marginTop: 6 }]}>Why this ad? {ad.why}</Text>
                  </View>
                </Row>
              </Card>
            </Pressable>
          )}

          <Row style={{ marginTop: 22, marginBottom: 11, justifyContent: 'space-between' }}>
            <SectionHeading>All {isCoaches ? 'coaches' : 'partners'}</SectionHeading>
            <Row gap={6}>
              {[
                ['rating', 'Rating'],
                ['price', 'Price'],
                ['distance', 'Distance'],
              ].map(([k, label]) => (
                <Pressable key={k} onPress={() => s.set('sortBy', k)}>
                  <Text style={[t.labelSm, { color: s.sortBy === k ? c.accent : c.txt3, backgroundColor: s.sortBy === k ? alpha(c.volt, 0.12) : 'transparent', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }]}>{label}</Text>
                </Pressable>
              ))}
            </Row>
          </Row>
          <View style={{ gap: 11 }}>
            {rest.map((p) => (
              <PersonCard key={p.id} p={p} onPress={() => s.openPerson(p.id)} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

export function PersonCard({ p, onPress }: { p: Person; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card onPress={onPress}>
      <Row style={{ padding: 14 }} gap={12}>
        <Avatar initials={initials(p.name)} />
        <View style={{ flex: 1 }}>
          <Row gap={6}>
            <Text style={[t.name, { color: c.txt }]}>{p.name}</Text>
            <Icon name="check-circle" size={14} color={c.accent} />
          </Row>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{personMeta(p)}</Text>
          <Row gap={5} style={{ marginTop: 4 }}>
            <Stars value={1} />
            <Text style={[t.labelSm, { color: c.txt }]}>{p.rating.toFixed(1)}</Text>
            <Text style={[t.caption, { color: c.txt3 }]}>({p.reviews})</Text>
          </Row>
        </View>
        {p.isCoach ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[t.price, { color: c.accent }]}>${p.price}</Text>
            <Text style={[t.caption, { color: c.txt3 }]}>per session</Text>
          </View>
        ) : (
          <MicroBadge label={p.level} bg={c.surface2} fg={c.txt2} />
        )}
      </Row>
    </Card>
  );
}

function BoostedCard({ p, onPress }: { p: Person; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card onPress={onPress} background={alpha(c.amber, 0.06)} borderColor={alpha(c.amber, 0.3)}>
      <Row style={{ padding: 14 }} gap={12}>
        <Avatar initials={initials(p.name)} size={58} radius={15} />
        <View style={{ flex: 1 }}>
          <Row gap={6}>
            <Text style={[t.name, { color: c.txt }]}>{p.name}</Text>
            <MicroBadge label="Boosted" bg={alpha(c.amber, 0.2)} fg={c.amberText} />
          </Row>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{personMeta(p)}</Text>
          <Row gap={5} style={{ marginTop: 4 }}>
            <Stars value={1} />
            <Text style={[t.labelSm, { color: c.txt }]}>{p.rating.toFixed(1)}</Text>
            <Text style={[t.caption, { color: c.txt3 }]}>({p.reviews})</Text>
          </Row>
        </View>
        {p.isCoach ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[t.price, { color: c.accent }]}>${p.price}</Text>
            <Text style={[t.caption, { color: c.txt3 }]}>per session</Text>
          </View>
        ) : (
          <MicroBadge label={p.level} bg={c.surface2} fg={c.txt2} />
        )}
      </Row>
    </Card>
  );
}
