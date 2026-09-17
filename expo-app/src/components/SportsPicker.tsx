import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fetchSports, Sport } from '../lib/profiles';
import { useTheme } from '../theme';
import { Row, SectionHeading, VoltButton } from './ui';

export function SportsPicker({ selected, onChange, coach = false }: {
  selected: string[]; onChange: (ids: string[]) => void; coach?: boolean;
}) {
  const { c, t } = useTheme();
  const [sports, setSports] = useState<Sport[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchSports().then((rows) => { if (active) setSports(rows); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  return (
    <View style={{ gap: 12 }}>
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        {coach ? 'Choose the sports or hobbies you teach.' : 'Choose your sports and hobbies of interest.'} Select as many as you like. The first is your primary choice. You can skip this and edit it later.
      </Text>
      {loading && <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading sports and hobbies…</Text>}
      {error && <>
        <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>Sports and hobbies could not load. You can retry or continue without choosing.</Text>
        <VoltButton label="Retry sports and hobbies" onPress={() => setAttempt(attempt + 1)} />
      </>}
      {!loading && !error && !sports.length && <Text style={[t.bodySm, { color: c.txt3 }]}>No sports or hobbies are available yet.</Text>}
      {(['sport', 'hobby'] as const).map((kind) => (
        <View key={kind} style={{ gap: 8 }}>
          <SectionHeading>{kind === 'sport' ? 'Sports' : 'Hobbies'}</SectionHeading>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {sports.filter((sport) => sport.kind === kind).map((sport) => {
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
