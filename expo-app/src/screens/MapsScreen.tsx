import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Field } from '../components/ui';
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

  return (
    <View style={{ flex: 1 }}>
      <MapCanvas
        center={center}
        markers={markers}
        initialZoom={me ? 13 : 4}
        onRecenter={me ? () => setCenter({ ...me }) : undefined}
      />

      <View style={{ position: 'absolute', top: 24, left: 18, right: 18 }}>
        <Field value={query} onChange={setQuery} placeholder="Search this area" icon="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 5, paddingHorizontal: 8, alignItems: 'center' }}>
          {areaFilters.map((label, index) => (
            <Pressable key={label} onPress={() => {
              track('maps_filter_used', { selected_index: index, active: filter !== label });
              setFilter(filter === label ? null : label);
            }} accessibilityRole="button" accessibilityLabel={`Filter by ${label === GYMS ? 'gyms' : label.toLowerCase()}`}
              accessibilityState={{ selected: filter === label }} style={{ minHeight: 36, justifyContent: 'center' }}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: alpha(c.volt, 0.24), backgroundColor: filter === label ? c.volt : alpha(c.volt, 0.1) }}>
                <Text style={[t.microBadge, { fontSize: 10, color: filter === label ? c.ink : c.accent }]}>{label}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {status && (
          <View style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt2 }]}>{status}</Text>
            {(loadError || peopleError) && (
              <Pressable accessibilityRole="button" accessibilityLabel="Try loading the map again"
                onPress={() => { setAttempt(attempt + 1); onRetry?.(); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[t.labelSm, { color: c.accent }]}>Try again</Text>
              </Pressable>
            )}
          </View>
        )}

        {!me && people !== null && (
          <Pressable accessibilityRole="button" accessibilityLabel="Open your profile to share your location"
            onPress={() => s.set('tab', 'profile')}
            style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' }}>
            <Text style={[t.labelSm, { color: c.accent }]}>Show my location · Profile → Edit profile</Text>
          </Pressable>
        )}
      </View>

      {selected && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${selected.name}`}
          onPress={() => { const id = selected.id; setSelected(null); s.openPerson(id); }}
          style={{ position: 'absolute', left: 18, right: 18, bottom: 18, backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSelected(null)}
            style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[t.label, { color: c.txt3 }]}>×</Text>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}
