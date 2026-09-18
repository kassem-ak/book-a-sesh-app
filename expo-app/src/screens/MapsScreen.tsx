import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Field } from '../components/ui';
import { track } from '../lib/analytics';
import * as D from '../state/sampleData';
import { useSports } from '../components/useSports';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';
import { DiscoverMap } from './DiscoverMap';

// Was a fixed ["GYM'S", 'BOXING', 'FOOTBALL'] copied off the design board.
// FOOTBALL is not in the sport taxonomy, so that chip could only ever return
// "Nothing matches that search." Deriving the chips from the real taxonomy
// means every one of them can match something.
//
// GYM'S stays as a curated grouping: it covers several taxonomy entries rather
// than one, which is why it has its own pattern in the filter below.
// Derived from the live taxonomy at render time, so a sport an admin approves
// becomes a filter chip without a rebuild.
const GYMS = "GYM'S";

export function MapsScreen({ loadError, onRetry }: { loadError?: string | null; onRetry?: () => void }) {
  const { c, t } = useTheme();
  const s = useStore();
  const [filter, setFilter] = useState<string | null>(null);
  const { sports } = useSports();
  const AREA_FILTERS = [GYMS, ...(sports ?? []).map((sport) => sport.name.toUpperCase())];
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const people = s.people(s.mode).filter((p) => {
    const sport = p.sport.toLowerCase();
    const matchesArea = !filter || (filter === "GYM'S" ? /gym|strength|calisthenics|fitness/.test(sport) : sport.includes(filter.toLowerCase()));
    return matchesArea && (!q || `${p.name} ${p.sport}`.toLowerCase().includes(q));
  });
  const emptyMessage = loadError ?? (!s.loaded.people ? 'Loading people...'
    : people.length ? 'No public map locations available yet.'
      : q || filter ? 'Nothing matches that search.' : 'Nobody listed in this area yet.');

  return (
    <View style={{ flex: 1 }}>
      <DiscoverMap people={people} emptyMessage={emptyMessage} />
      <View style={{ position: 'absolute', top: 24, left: 18, right: 18 }}>
        <Field value={query} onChange={setQuery} placeholder="Search this area" icon="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 5, paddingHorizontal: 8, alignItems: 'center' }}>
          {AREA_FILTERS.map((label, index) => (
            <Pressable key={label} onPress={() => {
              track('maps_filter_used', { selected_index: index, active: filter !== label });
              setFilter(filter === label ? null : label);
            }} accessibilityRole="button" accessibilityLabel={`Filter by ${label === "GYM'S" ? 'gyms' : label.toLowerCase()}`} accessibilityState={{ selected: filter === label }} style={{ minHeight: 36, justifyContent: 'center' }}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: alpha(c.volt, 0.24), backgroundColor: filter === label ? c.volt : alpha(c.volt, 0.1) }}>
                <Text style={[t.microBadge, { fontSize: 10, color: filter === label ? c.ink : c.accent }]}>{label}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        {loadError && onRetry && <Pressable onPress={onRetry} accessibilityRole="button" style={{ alignSelf: 'flex-start', padding: 12 }}>
          <Text style={[t.labelSm, { color: c.accent }]}>Try again</Text>
        </Pressable>}
      </View>
    </View>
  );
}
