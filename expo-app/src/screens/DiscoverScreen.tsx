import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  Avatar, Button, Card, Chip, Field, Icon, IconButton, Row, SectionHeading, Segmented, Stars,
  StatusLine, TAP_SLOP,
} from '../components/ui';
import { distanceKmBetween, formatDistanceKm, GeoPoint, getDevicePoint, parseGeoPoint } from '../lib/geo';
import { track } from '../lib/analytics';
import { Person, firstName, initials } from '../state/models';
import * as D from '../state/sampleData';
import { groupSports, matchesQuery, useSports } from '../components/useSports';
import { useStore } from '../state/store';
import { alpha, radii, useTheme } from '../theme';


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
  // The filter used to be a fixed list in sampleData, so a sport an admin
  // approved never appeared here and could not be filtered for.
  const { sports, failed: sportsFailed, retry: retrySports } = useSports();
  const sportNames = ['All', ...(sports ?? []).map((sport) => sport.name)];
  const [sportQuery, setSportQuery] = useState('');
  // Grouped, not one flat run of names: a sport and a hobby are different
  // things to go looking for, and the catalogue is long enough that reading it
  // as a single alphabetical column tells you nothing about which is which.
  const sportGroups = groupSports(sports ?? [], sportQuery);
  const matchCount = sportGroups.reduce((total, group) => total + group.items.length, 0);

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

  const sortOffered = isCoaches
    ? ['rating', 'price', ...(canSortByDistance ? ['distance'] : [])]
    : [...(canSortByDistance ? ['distance'] : [])];
  useEffect(() => {
    // Rating and Price disappear in Partners mode, but the stored key did not,
    // so the list stayed sorted by a chip that was no longer on screen.
    if (sortOffered.length > 0 && !sortOffered.includes(s.sortBy)) {
      setStoreValue('sortBy', sortOffered[0]);
    }
  }, [sortOffered.join(','), s.sortBy, setStoreValue]);

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
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={12}>
        <View style={{ flex: 1 }}>
          <Text style={[t.bodySm, { color: c.txt2 }]}>{s.authName ? `Hey ${firstName(s.authName)}` : 'Let’s'}</Text>
          <Text style={[t.pageTitle, { color: c.txt, marginTop: 3 }]}>Find your coach{ '\n' }or partner</Text>
          {s.authLoc.trim() ? <Text style={[t.label, { color: c.accent, marginTop: 3 }]}>{s.authLoc.trim()}</Text> : null}
        </View>
        {/* Nothing on this screen goes back, so the header is all trailing:
            two of the same control, not two 44pt boxes drawn by hand that
            happened to agree with IconButton on everything but the target. */}
        <Row gap={8}>
          <IconButton icon="bell" accessibilityLabel="Notifications" onPress={s.openNotifs} />
          <IconButton icon="user" accessibilityLabel="Your profile" onPress={() => s.set('tab', 'profile')} />
        </Row>
      </Row>

      {/* Everything that decides which people are in the list, in one block
          and in the order the sentence runs: coaches or partners, in which
          sport, called what. The sport used to be asked for twice -- a
          "Chosen Sport" summary on one row and a pill below it, both opening
          the same menu and both showing the same answer -- so a member had to
          read three separated controls to know what they were looking at, and
          the first card started below the fold. */}
      <View style={{ marginTop: 20, gap: 8 }}>
        <Segmented options={[{ key: 'coaches', label: 'coaches' }, { key: 'partners', label: 'Partners' }]}
          selected={s.mode} onSelect={(key) => {
            if (key !== s.mode) track('discover_filter_changed', { filter: 'mode', mode: key });
            s.set('mode', key);
          }} fontSize={13} pad={9} radius={radii.pill} />

        <Pressable onPress={() => s.set('sportMenu', !s.sportMenu)} accessibilityRole="button" accessibilityLabel={`Chosen sport: ${s.sport}. Choose a sport or hobby`} accessibilityState={{ expanded: s.sportMenu }}
          hitSlop={TAP_SLOP}
          style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 22 }}>
          <Text style={[t.labelSm, { color: c.soft, flex: 1 }]}>{s.sport === 'All' ? 'All sports and hobbies' : s.sport}</Text>
          <Icon name={s.sportMenu ? 'chevron-up' : 'chevron-down'} size={20} color={c.txt3} />
        </Pressable>
        {s.sportMenu && (
        <Card style={{ padding: 6 }}>
          <TextInput value={sportQuery} onChangeText={setSportQuery} placeholder="Search sports and hobbies"
            placeholderTextColor={c.txt3} accessibilityLabel="Search sports and hobbies" autoCorrect={false}
            style={[t.label, { color: c.txt, minHeight: 44, paddingHorizontal: 10, borderBottomColor: c.line2, borderBottomWidth: 1, marginBottom: 4 }]} />
          {!sports && !sportsFailed && <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3, padding: 11 }]}>Loading sports and hobbies…</Text>}
          {sportsFailed && (
            <View style={{ padding: 11, gap: 10, alignItems: 'flex-start' }}>
              <Text style={[t.bodySm, { color: c.danger }]}>Sports and hobbies could not load.</Text>
              <Button label="Try again" icon="refresh-cw" tone="danger"
                accessibilityLabel="Retry loading sports and hobbies" onPress={retrySports} />
            </View>
          )}
          {sports && matchCount === 0 && sportQuery.trim().length > 0 && (
            <Text style={[t.bodySm, { color: c.txt3, padding: 11 }]}>Nothing matches “{sportQuery.trim()}”.</Text>
          )}
          {(() => {
            const choose = (sport: string) => () => {
              if (sport !== s.sport) track('discover_filter_changed', { filter: 'sport', selected_index: sportNames.indexOf(sport) });
              s.set('sport', sport); s.set('sportMenu', false); setSportQuery('');
            };
            const option = (sport: string, label: string) => (
              <Pressable key={sport} accessibilityRole="button" accessibilityState={{ selected: s.sport === sport }}
                onPress={choose(sport)}
                style={{ paddingVertical: 11, paddingHorizontal: 10, borderRadius: 10, minHeight: 44, justifyContent: 'center', backgroundColor: s.sport === sport ? alpha(c.volt, 0.1) : 'transparent' }}>
                <Text style={[t.label, { color: s.sport === sport ? c.accent : c.txt }]}>{label}</Text>
              </Pressable>
            );
            return <>
              {/* Clearing the filter is not a sport, so it sits above both groups. */}
              {matchesQuery('All sports and hobbies', sportQuery) && option('All', 'All sports and hobbies')}
              {sportGroups.map((group) => (
                <View key={group.label}>
                  <Text accessibilityRole="header" style={[t.labelSm, { color: c.txt3, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }]}>{group.label}</Text>
                  {group.items.map((sport) => option(sport.name, sport.name))}
                </View>
              ))}
            </>;
          })()}
          <View style={{ padding: 11, borderTopColor: c.line2, borderTopWidth: 1, marginTop: 4 }}>
            <Button label="Request a sport or hobby" icon="plus" onPress={s.openRequest} />
          </View>
        </Card>
        )}
        <Field value={query} onChange={setQuery} placeholder="Search Coach, Mentor" icon="search" />
      </View>

      {featured.length > 0 && <>
        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Featured {isCoaches ? 'coaches' : 'partners'}</SectionHeading>
        <View style={{ gap: 12 }}>
          {featured.map(({ person, distanceLabel }) => <PersonCard key={person.id} p={person} distanceLabel={distanceLabel} onPress={() => s.openPerson(person.id)} />)}
        </View>
      </>}

      {/* Sorting is not filtering: it changes the order of this list and
          nothing about which people are in it, so it stays on the heading of
          the list it reorders rather than joining the filter block above. */}
      <Row style={{ marginTop: 20, marginBottom: 11, justifyContent: 'space-between', flexWrap: 'wrap' }} gap={8}>
        <SectionHeading>All {isCoaches ? 'coaches' : 'partners'}</SectionHeading>
        {entries.length > 1 && <Row gap={8}>
          {sortOptions.map(({ key, label }) => (
            <Chip key={key} label={label} active={s.sortBy === key} onPress={() => {
              if (key !== s.sortBy) track('discover_sort_changed', { sort: key });
              setStoreValue('sortBy', key);
            }} />
          ))}
        </Row>}
      </Row>
      {loadError ? <View accessibilityRole="alert">
        <StatusLine>{loadError}</StatusLine>
        {onRetry && <Button label="Try again" icon="refresh-cw" tone="danger" onPress={onRetry} style={{ marginTop: 12 }} />}
      </View> : entries.length === 0 && (
        <View style={{ gap: 12, alignItems: 'flex-start' }}>
          <StatusLine>{emptyMessage}</StatusLine>
          {/* Only reachable from onboarding before this, so a radius that
              excluded everybody was permanent. */}
          {s.loaded.people && base.length > 0 && s.searchRadius < 100 && (
            <Button label="Search wider" icon="maximize-2"
              accessibilityLabel={`Widen the search to ${Math.min(s.searchRadius * 2, 100)} km`}
              onPress={() => setStoreValue('searchRadius', Math.min(s.searchRadius * 2, 100))} />
          )}
        </View>
      )}
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
