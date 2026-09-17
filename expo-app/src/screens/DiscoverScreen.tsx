import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Avatar,
  Card,
  Field,
  Icon,
  Row,
  SectionHeading,
  Segmented,
  Stars,
} from '../components/ui';
import { distanceKmBetween, formatDistanceKm, GeoPoint, getDevicePoint, parseGeoPoint } from '../lib/geo';
import { track } from '../lib/analytics';
import { Person, firstName, initials } from '../state/models';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';


type GeoPerson = Person & { coordinates?: GeoPoint | null };
type DiscoverEntry = { person: Person; index: number; distanceKm: number | null; distanceLabel: string | null };

function personCoordinates(p: Person) {
  return parseGeoPoint((p as GeoPerson).coordinates ?? p);
}

function personDistanceKm(p: Person, devicePoint: GeoPoint | null | undefined) {
  return distanceKmBetween(devicePoint ?? null, personCoordinates(p));
}

function personMetaLabel(p: Person, distanceLabel?: string | null) {
  const parts = p.isCoach ? [p.sport] : [p.sport, p.goal ?? ''];
  if (distanceLabel) parts.push(distanceLabel);
  return parts.filter(Boolean).join(' - ');
}

function matchesSport(p: Person, sport: string) {
  if (sport === 'All') return true;
  return p.sport.toLowerCase().includes(sport.toLowerCase());
}

function Note({ children }: { children: React.ReactNode }) {
  const { c, t } = useTheme();
  return (
    <Text accessibilityRole="text" style={[t.bodySm, { color: c.txt3, marginTop: 4 }]}>
      {children}
    </Text>
  );
}

export function DiscoverScreen({ loadError, onRetry }: { loadError?: string | null; onRetry?: () => void }) {
  const { c, t } = useTheme();
  const s = useStore();
  const isCoaches = s.mode === 'coaches';
  const setStoreValue = useStore((state) => state.set);
  const [devicePoint, setDevicePoint] = useState<GeoPoint | null | undefined>(undefined);
  const query = s.discSearch;
  const setQuery = (value: string) => {
    s.set('discSearch', value);
    track('discover_searched', { has_input: value.trim().length > 0 });
  };
  const q = query.trim().toLowerCase();

  const base = s.people(isCoaches ? 'coaches' : 'partners').filter((p) => matchesSport(p, s.sport) && (!q || `${p.name} ${p.sport} ${p.tags.join(' ')}`.toLowerCase().includes(q)));
  const hasCoordinatePeople = base.some((p) => personCoordinates(p));

  useEffect(() => {
    if (!hasCoordinatePeople) {
      setDevicePoint(null);
      return;
    }

    let active = true;
    getDevicePoint().then((point) => {
      if (active) setDevicePoint(point);
    });
    return () => {
      active = false;
    };
  }, [hasCoordinatePeople]);

  const entries: DiscoverEntry[] = base
    .map((person, index) => {
      const distanceKm = personDistanceKm(person, devicePoint);
      return { person, index, distanceKm, distanceLabel: formatDistanceKm(distanceKm) };
    })
    .filter((entry) => entry.distanceKm === null || entry.distanceKm <= s.searchRadius);
  const canSortByDistance = entries.some((entry) => entry.distanceKm !== null);
  const distanceCapabilityKnown = !hasCoordinatePeople || devicePoint !== undefined;

  useEffect(() => {
    if (s.sortBy === 'distance' && distanceCapabilityKnown && !canSortByDistance) setStoreValue('sortBy', 'rating');
  }, [canSortByDistance, distanceCapabilityKnown, s.sortBy, setStoreValue]);

  const activeSortBy = s.sortBy === 'distance' && !canSortByDistance ? null : s.sortBy;
  const featured = entries.filter((entry) => entry.person.boosted);
  const rest = entries
    .filter((entry) => !entry.person.boosted)
    .sort((a, b) => {
      if (activeSortBy === 'price') return (a.person.price ?? 0) - (b.person.price ?? 0);
      if (activeSortBy === 'distance') {
        if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
        if (a.distanceKm !== null) return -1;
        if (b.distanceKm !== null) return 1;
        return a.index - b.index;
      }
      if (activeSortBy === 'rating') return b.person.rating - a.person.rating;
      return a.index - b.index;
    });
  const sortOptions = [
    ...(isCoaches ? [{ key: 'rating', label: 'Rating' }] : []),
    ...(isCoaches ? [{ key: 'price', label: 'Price' }] : []),
    ...(canSortByDistance ? [{ key: 'distance', label: 'Distance' }] : []),
  ];
  const peopleLabel = isCoaches ? 'coaches' : 'training partners';
  const emptyMessage = !s.loaded.people
    ? `Loading ${peopleLabel}...`
    : base.length > 0 && entries.length === 0 ? `No ${peopleLabel} within ${s.searchRadius} km.`
    : q ? `No ${peopleLabel} match your search.`
      : s.sport === 'All' ? `No ${peopleLabel} listed yet.` : `No ${peopleLabel} listed for ${s.sport} yet.`;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 24, paddingBottom: 24 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={12}>
        <View style={{ flex: 1 }}>
          <Text style={[t.bodySm, { color: c.txt2 }]}>{s.authName ? `Hey ${firstName(s.authName)}` : 'Let’s'}</Text>
          <Text style={[t.pageTitle, { color: c.txt, marginTop: 3 }]}>Find your coach{ '\n' }or partner</Text>
          {s.authLoc.trim() ? <Text style={[t.label, { color: c.accent, marginTop: 3 }]}>{s.authLoc.trim()}</Text> : null}
        </View>
        <Row gap={8}>
          <Pressable onPress={s.openNotifs} accessibilityRole="button" accessibilityLabel="Notifications"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={24} color={c.txt} />
          </Pressable>
          <Pressable onPress={() => s.set('tab', 'profile')} accessibilityRole="button" accessibilityLabel="Your profile"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={24} color={c.txt} />
          </Pressable>
        </Row>
      </Row>

      <Row style={{ marginTop: 28, marginBottom: 12, justifyContent: 'space-between' }} gap={12}>
        <Pressable onPress={() => s.set('sportMenu', !s.sportMenu)} accessibilityRole="button" accessibilityLabel={`Chosen sport: ${s.sport}. Choose a sport`} style={{ minHeight: 44, justifyContent: 'center', flex: 1 }}>
          <Text style={[t.caption, { color: c.txt2, marginBottom: 5 }]}>Chosen Sport</Text>
          <Row gap={5}>
            {s.sport === 'All' ? <>
              <MaterialCommunityIcons name="basketball" size={16} color={c.accent} />
              <MaterialCommunityIcons name="tennis" size={16} color={c.accent} />
              <MaterialCommunityIcons name="boxing-glove" size={16} color={c.accent} />
            </> : <Text style={[t.labelSm, { color: c.accent }]} numberOfLines={1}>{s.sport}</Text>}
          </Row>
        </Pressable>
        <View style={{ width: 150 }}>
          <Segmented options={[{ key: 'coaches', label: 'coaches' }, { key: 'partners', label: 'Partners' }]}
            selected={s.mode} onSelect={(key) => {
              if (key !== s.mode) track('discover_filter_changed', { filter: 'mode', mode: key });
              s.set('mode', key);
            }} fontSize={13} pad={9} />
        </View>
      </Row>

      <Pressable onPress={() => s.set('sportMenu', !s.sportMenu)} accessibilityRole="button" accessibilityLabel="Choose sport or hobby" accessibilityState={{ expanded: s.sportMenu }}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 22 }}>
        <Text style={[t.labelSm, { color: c.soft, flex: 1 }]}>{s.sport === 'All' ? 'All sports and hobbies' : s.sport}</Text>
        <Icon name={s.sportMenu ? 'chevron-up' : 'chevron-down'} size={20} color={c.txt3} />
      </Pressable>
      {s.sportMenu && (
        <Card style={{ marginTop: 8, padding: 6 }}>
          {D.sportNames.map((sport) => (
            <Pressable key={sport} accessibilityRole="button" accessibilityState={{ selected: s.sport === sport }}
              onPress={() => {
                if (sport !== s.sport) track('discover_filter_changed', { filter: 'sport', selected_index: D.sportNames.indexOf(sport) });
                s.set('sport', sport); s.set('sportMenu', false);
              }}
              style={{ paddingVertical: 11, paddingHorizontal: 10, borderRadius: 10, backgroundColor: s.sport === sport ? alpha(c.volt, 0.1) : 'transparent' }}>
              <Text style={[t.label, { color: s.sport === sport ? c.accent : c.txt }]}>{sport === 'All' ? 'All sports and hobbies' : sport}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={s.openRequest} style={{ padding: 11, borderTopColor: c.line2, borderTopWidth: 1, marginTop: 4 }}>
            <Text style={[t.label, { color: c.accent }]}>Request a sport or hobby</Text>
          </Pressable>
        </Card>
      )}
      <View style={{ marginTop: 10 }}>
        <Field value={query} onChange={setQuery} placeholder="Search Coach, Mentor" icon="search" />
      </View>

      {featured.length > 0 && <>
        <SectionHeading style={{ marginTop: 26, marginBottom: 11 }}>Featured {isCoaches ? 'coaches' : 'partners'}</SectionHeading>
        <View style={{ gap: 12 }}>
          {featured.map(({ person, distanceLabel }) => <PersonCard key={person.id} p={person} distanceLabel={distanceLabel} onPress={() => s.openPerson(person.id)} />)}
        </View>
      </>}

      <Row style={{ marginTop: 26, marginBottom: 11, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <SectionHeading>All {isCoaches ? 'coaches' : 'partners'}</SectionHeading>
        {entries.length > 1 && <Row gap={4}>
          {sortOptions.map(({ key, label }) => (
            <Pressable key={key} onPress={() => {
              if (key !== s.sortBy) track('discover_sort_changed', { sort: key });
              setStoreValue('sortBy', key);
            }} accessibilityRole="button" accessibilityLabel={`Sort by ${label.toLowerCase()}`} accessibilityState={{ selected: s.sortBy === key }} hitSlop={8}>
              <Text style={[t.labelSm, { color: s.sortBy === key ? c.accent : c.txt3, paddingHorizontal: 6, paddingVertical: 5 }]}>{label}</Text>
            </Pressable>
          ))}
        </Row>}
      </Row>
      {loadError ? <View accessibilityRole="alert">
        <Note>{loadError}</Note>
        {onRetry && <Pressable onPress={onRetry} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 12 }}><Text style={[t.labelSm, { color: c.accent }]}>Try again</Text></Pressable>}
      </View> : entries.length === 0 && <Note>{emptyMessage}</Note>}
      <View style={{ gap: 12 }}>
        {rest.map(({ person, distanceLabel }) => <PersonCard key={person.id} p={person} distanceLabel={distanceLabel} onPress={() => s.openPerson(person.id)} />)}
      </View>
    </ScrollView>
  );
}

export function PersonCard({ p, distanceLabel, onPress }: { p: Person; distanceLabel?: string | null; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card onPress={onPress} background={p.boosted ? alpha(c.amber, 0.09) : undefined} borderColor={p.boosted ? alpha(c.amber, 0.3) : undefined}>
      <Row style={{ padding: 14 }} gap={14}>
        <Avatar initials={initials(p.name)} avatarUrl={p.avatarUrl} size={54} radius={16} bg={p.boosted ? alpha(c.amber, 0.13) : undefined} />
        <View style={{ flex: 1 }}>
          <Text style={[t.name, { color: c.txt }]} numberOfLines={1}>{p.name}</Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]} numberOfLines={1}>{personMetaLabel(p, distanceLabel)}</Text>
          {p.reviews > 0 && <Row gap={3} style={{ marginTop: 4 }}>
            <Stars value={1} size={12} />
            <Text style={[t.labelSm, { color: c.amberText }]}>{p.rating.toFixed(1)} ({p.reviews})</Text>
          </Row>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {p.boosted && <View style={{ backgroundColor: alpha(c.amber, 0.2), borderColor: alpha(c.amber, 0.3), borderWidth: 1, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 }}>
            <Text style={[t.microBadge, { color: c.amberText }]}>BOOSTED</Text>
          </View>}
          {p.isCoach ? <>
            <Text style={[t.price, { color: c.accent }]}>${p.price}</Text>
            <Text style={[t.caption, { color: c.txt3 }]}>per session</Text>
          </> : <Text style={[t.labelSm, { color: c.txt2 }]}>{p.level}</Text>}
        </View>
      </Row>
    </Card>
  );
}
