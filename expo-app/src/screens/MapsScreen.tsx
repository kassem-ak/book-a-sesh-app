import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Field, Row } from '../components/ui';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';
import { DiscoverMap } from './DiscoverMap';

const AREA_FILTERS = ["GYM'S", 'BOXING', 'FOOTBALL'];

export function MapsScreen({ loadError, onRetry }: { loadError?: string | null; onRetry?: () => void }) {
  const { c, t } = useTheme();
  const s = useStore();
  const [filter, setFilter] = useState<string | null>(null);
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
        <Row style={{ marginTop: 6, paddingHorizontal: 8 }} gap={5}>
          {AREA_FILTERS.map((label) => (
            <Pressable key={label} onPress={() => setFilter(filter === label ? null : label)} accessibilityRole="button" accessibilityLabel={`Filter by ${label === "GYM'S" ? 'gyms' : label.toLowerCase()}`} accessibilityState={{ selected: filter === label }} style={{ minHeight: 36, justifyContent: 'center' }}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: alpha(c.volt, 0.24), backgroundColor: filter === label ? c.volt : alpha(c.volt, 0.1) }}>
                <Text style={[t.microBadge, { fontSize: 10, color: filter === label ? c.ink : c.accent }]}>{label}</Text>
              </View>
            </Pressable>
          ))}
        </Row>
        {loadError && onRetry && <Pressable onPress={onRetry} accessibilityRole="button" style={{ alignSelf: 'flex-start', padding: 12 }}>
          <Text style={[t.labelSm, { color: c.accent }]}>Try again</Text>
        </Pressable>}
      </View>
    </View>
  );
}
