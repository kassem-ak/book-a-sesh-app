import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ActionBar, Avatar, Button, Card, Chip, ErrorNote, Field, IconButton } from '../components/ui';
import { MapCanvas, MapMarker } from '../components/MapCanvas';
import { useSports } from '../components/useSports';
import { track } from '../lib/analytics';
import { getDevicePoint, GeoPoint } from '../lib/geo';
import { fetchPeopleOnMap, MapPerson } from '../lib/queries';
import { initials } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// GYM'S stays as a curated grouping: it covers several taxonomy entries rather
// than one, which is why it has its own pattern in the filter below. The rest
// are derived from the live taxonomy at render time, so a sport an admin
// approves becomes a filter chip without a rebuild.
const GYMS = "GYM'S";

// Where the map opens when we know nothing at all: no device position and
// nobody sharing one. Zoomed far enough out to be honest about that rather than
// pretending to know a city.
const WORLD: GeoPoint = { latitude: 20, longitude: 0 };

export function MapsScreen({ loadError, onRetry }: { loadError?: string | null; onRetry?: () => void }) {
  const { c, t } = useTheme();
  const s = useStore();
  const [filter, setFilter] = useState<string | null>(null);
  const { sports } = useSports();
  const areaFilters = [GYMS, ...(sports ?? []).map((sport) => sport.name.toUpperCase())];
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const [me, setMe] = useState<GeoPoint | null>(null);
  const [people, setPeople] = useState<MapPerson[] | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<MapPerson | null>(null);
  const [center, setCenter] = useState<GeoPoint>(WORLD);

  useEffect(() => {
    let active = true;
    getDevicePoint().then((point) => {
      if (!active || !point) return;
      setMe(point);
      setCenter(point);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setPeopleError(null);
    fetchPeopleOnMap()
      .then((rows) => { if (active) setPeople(rows); })
      .catch(() => { if (active) { setPeople([]); setPeopleError('People on the map could not load.'); } });
    return () => { active = false; };
  }, [attempt]);

  const shown = useMemo(() => (people ?? []).filter((person) => {
    const sport = (person.sport ?? '').toLowerCase();
    const matchesArea = !filter || (filter === GYMS
      ? /gym|strength|calisthenics|fitness/.test(sport)
      : sport.includes(filter.toLowerCase()));
    return matchesArea && (!q || `${person.name} ${sport}`.toLowerCase().includes(q));
  }), [people, filter, q]);

  // Nobody has a device position and nobody is sharing: open on the first
  // person we do have rather than the middle of the ocean.
  useEffect(() => {
    if (me || !shown.length) return;
    setCenter({ latitude: shown[0].latitude, longitude: shown[0].longitude });
  }, [me, shown]);

  const markers: MapMarker[] = [
    ...shown.map((person) => ({
      key: person.id,
      point: { latitude: person.latitude, longitude: person.longitude },
      label: [person.name, person.role === 'coach' ? 'coach' : 'member', person.sport]
        .filter(Boolean).join(', '),
      onPress: () => setSelected(person),
      render: () => (
        <View style={{ alignItems: 'center' }}>
          {/* An 'area' subject is drawn inside a halo, so a pin is never read
              as more precise than the person agreed to share. */}
          {person.shareLevel === 'area' && (
            <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 999, top: -8, backgroundColor: alpha(c.accent, 0.16) }} />
          )}
          <Avatar initials={initials(person.name)} avatarUrl={person.avatarUrl} size={44} radius={999} />
        </View>
      ),
    })),
    ...(me ? [{
      key: 'me',
      point: me,
      render: () => (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: 44, height: 44 }}>
          <View style={{ width: 44, height: 44, borderRadius: 999, position: 'absolute', backgroundColor: alpha(c.volt, 0.25) }} />
          <View style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: c.volt, borderWidth: 2, borderColor: c.ink }} />
        </View>
      ),
    }] : []),
  ];

  const status = loadError ?? peopleError
    ?? (people === null ? 'Loading people…'
      : shown.length === 0
        ? (q || filter ? 'Nothing matches that search.'
          : 'Nobody nearby is sharing their location yet.')
        : null);

  const failure = loadError ?? peopleError;

  return (
    <View style={{ flex: 1 }}>
      {/* The map only owns the space above whatever is docked below it. The
          selected-person card used to float over the map at the bottom edge,
          on top of the zoom and recentre controls at the bottom right; on a
          narrow phone it covered them outright, so choosing someone cost you
          the ability to zoom. Docking the card and the bar here shortens the
          map instead, and the map's own controls ride up with its bottom
          edge. */}
      <View style={{ flex: 1 }}>
        <MapCanvas
          center={center}
          markers={markers}
          initialZoom={me ? 13 : 4}
          onRecenter={me ? () => setCenter({ ...me }) : undefined}
        />

        {/* The search and the area chips decide the same thing -- who is on
            this map -- so they are one block in one vocabulary, the Field and
            the Chip that Discover filters with. They were a bordered input
            above a run of 36pt badges indented a further 8pt, which read as
            two unrelated controls that happened to sit near each other. */}
        <View style={{ position: 'absolute', top: 24, left: 18, right: 18, gap: 8 }}>
          <Field value={query} onChange={setQuery} placeholder="Search this area" icon="search" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
            {areaFilters.map((label, index) => (
              <Chip
                key={label}
                label={label}
                active={filter === label}
                onPress={() => {
                  track('maps_filter_used', { selected_index: index, active: filter !== label });
                  setFilter(filter === label ? null : label);
                }}
              />
            ))}
          </ScrollView>

          {/* A failure and its way out are one thing, so they are one card
              rather than a note with a button loose underneath it. */}
          {failure ? (
            <ErrorNote message={failure} retryLabel="Try loading the map again"
              onRetry={() => { setAttempt(attempt + 1); onRetry?.(); }} />
          ) : status ? (
            <View style={{ alignSelf: 'flex-start', backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt2 }]}>{status}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {selected && (
        <Card onPress={() => { const id = selected.id; setSelected(null); s.openPerson(id); }}
          accessibilityLabel={`Open ${selected.name}`} radius={18} background={c.bg}
          style={{ margin: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar initials={initials(selected.name)} avatarUrl={selected.avatarUrl} size={44} radius={14} />
          <View style={{ flex: 1 }}>
            <Text style={[t.name, { color: c.txt }]}>{selected.name}</Text>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              {selected.role === 'coach' ? 'Coach' : 'Member'}{selected.sport ? ` · ${selected.sport}` : ''}
            </Text>
            <Text style={[t.caption, { color: c.txt3, marginTop: 2 }]}>
              {selected.shareLevel === 'exact' ? 'Sharing a pin' : 'Sharing an approximate area (~1 km)'}
            </Text>
          </View>
          {/* Dismissing this card is the card's own business, so the control
              stays in the card and never joins the bar below. */}
          <IconButton icon="x" accessibilityLabel="Close" onPress={() => setSelected(null)} />
        </Card>
      )}

      {/* This one leaves the map: it opens Profile, where sharing is turned
          on. Filed with the search and the area chips it read as a third way
          to change what the map shows, which is the one thing it does not do.
          In the bar it is what it is -- the screen's own verb, and the answer
          to the line above saying nobody can see you. */}
      {!me && people !== null && (
        <ActionBar>
          <Button label="Show my location" icon="map-pin" full
            accessibilityLabel="Open your profile to share your location"
            onPress={() => s.set('tab', 'profile')} />
        </ActionBar>
      )}
    </View>
  );
}
