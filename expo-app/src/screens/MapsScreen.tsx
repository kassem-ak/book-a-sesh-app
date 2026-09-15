import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Chip, Icon, Row } from '../components/ui';
import { useStore } from '../state/store';
import { useTheme } from '../theme';
import { DiscoverMap } from './DiscoverMap';

const AREA_FILTERS = ["GYM'S", 'BOXING', 'FOOTBALL'];

// Maps is its own tab on the redesigned board (promoted out of Discover).
export function MapsScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const [filter, setFilter] = React.useState<string | null>(null);
  const all = s.people(s.mode === 'partners' ? 'partners' : 'coaches');
  // chips previously set state but never filtered the list
  const people = filter
    ? all.filter((p) => p.sport.toLowerCase().includes(filter.toLowerCase().replace(/'S$/i, '')))
    : all;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 }}>
      <Row
        style={{
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 13,
        }}
        gap={10}
      >
        <Icon name="search" size={18} color={c.txt3} />
        <Text style={[t.body, { color: c.txt3 }]}>Search this area</Text>
      </Row>

      <Row style={{ marginTop: 12, flexWrap: 'wrap' }} gap={8}>
        {AREA_FILTERS.map((f) => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(filter === f ? null : f)} />
        ))}
      </Row>

      {/* The map no longer falls back to sample people, so an empty map needs
          to say so rather than look broken. */}
      {people.length === 0 && (
        <Text accessibilityRole="text" style={[t.bodySm, { color: c.txt3, marginTop: 12 }]}>
          {s.loaded.people ? 'Nobody listed in this area yet.' : 'Loading people…'}
        </Text>
      )}
      <View style={{ marginTop: 14 }}>
        <DiscoverMap people={people} />
      </View>
    </ScrollView>
  );
}
