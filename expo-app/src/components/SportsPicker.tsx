import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Sport } from '../lib/profiles';
import { useTheme } from '../theme';
import { Row, SectionHeading, VoltButton } from './ui';
import { matchesQuery, useSports } from './useSports';

export function SportsPicker({ selected, onChange, coach = false }: {
  selected: string[]; onChange: (ids: string[]) => void; coach?: boolean;
}) {
  const { c, t } = useTheme();
  const { sports: loaded, failed: error, retry } = useSports();
  const sports: Sport[] = loaded ?? [];
  const loading = !loaded && !error;
  const [query, setQuery] = useState('');
  // Selected entries always stay visible, even when the search excludes them:
  // a search that appears to deselect things is worse than a longer list.
  const visible = (kind: Sport['kind']) => sports
    .filter((sport) => sport.kind === kind)
    .filter((sport) => selected.includes(sport.id) || matchesQuery(sport.name, query));
  const anyMatch = visible('sport').length + visible('hobby').length > 0;
  return (
    <View style={{ gap: 12 }}>
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        {coach ? 'Choose the sports or hobbies you teach.' : 'Choose your sports and hobbies of interest.'} Select as many as you like. The first is your primary choice. You can skip this and edit it later.
      </Text>
      {loading && <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading sports and hobbies…</Text>}
      {error && <>
        <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>Sports and hobbies could not load. You can retry or continue without choosing.</Text>
        <VoltButton label="Retry sports and hobbies" onPress={retry} />
      </>}
      {sports.length > 0 && (
        <TextInput value={query} onChangeText={setQuery} placeholder="Search sports and hobbies"
          placeholderTextColor={c.txt3} accessibilityLabel="Search sports and hobbies" autoCorrect={false}
          style={[t.body, { color: c.txt, minHeight: 44, paddingHorizontal: 14, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.surface }]} />
      )}
      {sports.length > 0 && !anyMatch && (
        <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Nothing matches “{query.trim()}”.</Text>
      )}
      {!loading && !error && !sports.length && <Text style={[t.bodySm, { color: c.txt3 }]}>No sports or hobbies are available yet.</Text>}
      {(['sport', 'hobby'] as const).filter((kind) => visible(kind).length > 0).map((kind) => (
        <View key={kind} style={{ gap: 8 }}>
          <SectionHeading>{kind === 'sport' ? 'Sports' : 'Hobbies'}</SectionHeading>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {visible(kind).map((sport) => {
              const checked = selected.includes(sport.id);
              return <Pressable key={sport.id} accessibilityRole="checkbox" accessibilityLabel={sport.name}
                accessibilityState={{ checked }} accessibilityHint={selected[0] === sport.id ? 'Primary choice' : undefined}
                onPress={() => onChange(checked ? selected.filter((id) => id !== sport.id) : [...selected, sport.id])}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: c.line, backgroundColor: checked ? c.volt : c.surface }}>
                <Text style={[t.labelSm, { color: checked ? c.ink : c.txt }]}>{sport.name}{selected[0] === sport.id ? ' · Primary' : ''}</Text>
              </Pressable>;
            })}
          </Row>
        </View>
      ))}
      {selected.slice(1).map((id) => {
        const sport = sports.find((item) => item.id === id);
        return sport ? <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Make ${sport.name} primary`}
          onPress={() => onChange([id, ...selected.filter((other) => other !== id)])}
          style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={[t.labelSm, { color: c.accent }]}>Make {sport.name} primary</Text>
        </Pressable> : null;
      })}
    </View>
  );
}
