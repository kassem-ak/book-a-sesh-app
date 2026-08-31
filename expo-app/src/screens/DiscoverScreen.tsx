import React, { useEffect } from 'react';
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
import { DiscoverSort, fetchCoaches } from '../lib/queries';
import { CoachPkg, Person, initials, personMeta } from '../state/models';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';


type RelatedName = { name?: string | null } | { name?: string | null }[] | null;

type RemotePackage = {
  id: string;
  sessions?: number | null;
  price_cents?: number | null;
  active?: boolean | null;
};

type RemoteCoach = {
  user_id: string;
  headline?: string | null;
  bio?: string | null;
  level?: string | null;
  price_cents?: number | null;
  reply_time?: string | null;
  sessions_count?: number | null;
  rating_avg?: number | string | null;
  reviews_count?: number | null;
  boosted?: boolean | null;
  user?: RelatedName;
  sport?: RelatedName;
  packages?: RemotePackage[] | null;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function toNumber(value: number | string | null | undefined) {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function pseudoDistance(id: string) {
  const sum = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Math.round((0.6 + (sum % 36) / 10) * 10) / 10;
}

function fromRemoteCoach(row: RemoteCoach): Person {
  const name = firstRelated(row.user)?.name ?? 'Coach';
  const sport = firstRelated(row.sport)?.name ?? 'Coaching';
  const packages: CoachPkg[] = (row.packages ?? [])
    .filter((pkg) => pkg.active !== false && (pkg.sessions ?? 0) > 0)
    .map((pkg) => ({ id: pkg.id, sessions: pkg.sessions ?? 1, price: Math.round((pkg.price_cents ?? 0) / 100) }))
    .filter((pkg) => pkg.id && pkg.price >= 0)
    .sort((a, b) => a.sessions - b.sessions);
  const headline = row.headline ?? row.level ?? 'Coach';
  return {
    id: row.user_id,
    name,
    sport,
    rating: toNumber(row.rating_avg),
    reviews: row.reviews_count ?? 0,
    price: Math.round((row.price_cents ?? 0) / 100),
    boosted: Boolean(row.boosted),
    distance: pseudoDistance(row.user_id),
    level: row.level ?? headline,
    sessions: row.sessions_count ? `${row.sessions_count}+` : '0',
    reply: row.reply_time ?? 'Today',
    bio: row.bio ?? row.headline ?? `${name} is available for ${sport.toLowerCase()} sessions.`,
    tags: [headline, sport].filter((tag): tag is string => Boolean(tag)),
    isCoach: true,
    packages,
  };
}
function matchesSport(p: Person, sport: string) {
  if (sport === 'All') return true;
  return p.sport.toLowerCase().includes(sport.toLowerCase());
}

// Spec section 2 sport row. Feather has no sport glyphs, so these are the
// closest available stand-ins until custom icons land.
const SPORT_ICONS: { name: string; icon: 'activity' | 'zap' | 'wind' | 'triangle' | 'heart' | 'music' | 'grid' | 'target' }[] = [
  { name: 'Strength', icon: 'activity' },
  { name: 'Boxing', icon: 'zap' },
  { name: 'Running', icon: 'wind' },
  { name: 'Climbing', icon: 'triangle' },
  { name: 'Yoga', icon: 'heart' },
  { name: 'Calisthenics', icon: 'target' },
  { name: 'Music', icon: 'music' },
  { name: 'Chess', icon: 'grid' },
];

export function DiscoverScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const isCoaches = s.mode === 'coaches';
  const setRemotePeople = useStore((state) => state.setRemotePeople);

  useEffect(() => {
    if (!isCoaches) return;
    let active = true;
    fetchCoaches(s.sortBy as DiscoverSort)
      .then((rows) => {
        if (active && Array.isArray(rows)) setRemotePeople(rows.map((row) => fromRemoteCoach(row as RemoteCoach)));
      })
      .catch(() => {
        if (active) setRemotePeople([]);
      });
    return () => {
      active = false;
    };
  }, [isCoaches, s.sortBy, setRemotePeople]);

  const base = s.people(isCoaches ? 'coaches' : 'partners').filter((p) => matchesSport(p, s.sport));
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
        <Row gap={10}>
          <Pressable
            onPress={s.openNotifs}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="bell" size={20} color={c.txt2} />
            {!s.notifSeen && (
              <View style={{ position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: c.volt }} />
            )}
          </Pressable>
          {/* Profile left the nav on the redesign board; this is its entry point. */}
          <Pressable
            onPress={() => s.set('tab', 'profile')}
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="user" size={20} color={c.txt2} />
          </Pressable>
        </Row>
      </Row>

      {/* Spec section 2: Chosen Sport row with small sport icons */}
      <SectionHeading style={{ marginTop: 20, marginBottom: 10 }}>Chosen Sport</SectionHeading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
        {SPORT_ICONS.map(({ name, icon }) => {
          const active = s.sport === name;
          return (
            <Pressable
              key={name}
              onPress={() => s.set('sport', active ? 'All' : name)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${name}`}
              accessibilityState={{ selected: active }}
              style={{ alignItems: 'center', width: 62 }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? c.volt : c.surface,
                  borderColor: active ? c.volt : c.line,
                  borderWidth: 1,
                }}
              >
                <Icon name={icon} size={20} color={active ? c.ink : c.txt2} />
              </View>
              <Text style={[t.caption, { color: active ? c.accent : c.txt3, marginTop: 5 }]} numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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

      {/* Cards/Map toggle removed: Maps is its own tab on the redesign board. */}
      <>
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
            <Pressable onPress={() => s.set('tab', 'shop')} style={{ marginTop: 11 }}>
              <Card>
                <Row style={{ padding: 14, alignItems: 'flex-start' }} gap={12}>
                  <Avatar initials={ad.logo} size={46} radius={13} fontSize={15} bg={ad.tint} />
                  <View style={{ flex: 1 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={[t.name, { color: c.txt, flex: 1 }]}>{ad.brand}</Text>
                      <MicroBadge label="AD" bg={c.surface2} fg={c.txt2} />
                      <Pressable onPress={() => s.set('adsHidden', { ...s.adsHidden, discover: true })} accessibilityRole="button" accessibilityLabel="Dismiss ad" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ marginLeft: 8 }}>
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
      </>
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
