import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sport } from '../lib/profiles';
import { useTheme } from '../theme';
import { Field, Icon, MicroBadge, Row, SectionHeading, VoltButton } from './ui';
import { groupSports, useSports } from './useSports';

/** How many options a group shows before it asks to be expanded.
 *
 *  The catalogue grows every time an admin approves a request, and a wall of
 *  every name is the thing this picker is trying not to be. Searching ignores
 *  the cap: someone typing has already narrowed it themselves. */
const PREVIEW = 8;

export function SportsPicker({ selected, onChange, coach = false }: {
  selected: string[]; onChange: (ids: string[]) => void; coach?: boolean;
}) {
  const { c, t } = useTheme();
  const { sports: loaded, failed: error, retry } = useSports();
  const sports: Sport[] = loaded ?? [];
  const loading = !loaded && !error;
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);

  const byId = (id: string) => sports.find((sport) => sport.id === id);
  // What is already chosen lives in its own list above, so the catalogue below
  // only ever offers what is not. The two never show the same name twice.
  const offered = sports.filter((sport) => !selected.includes(sport.id));
  const groups = groupSports(offered, query);
  const searching = query.trim().length > 0;

  const pick = (id: string) => onChange([...selected, id]);
  const drop = (id: string) => onChange(selected.filter((other) => other !== id));
  const promote = (id: string) => onChange([id, ...selected.filter((other) => other !== id)]);

  return (
    <View style={{ gap: 14 }}>
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        {coach ? 'Choose the sports or hobbies you teach.' : 'Choose your sports and hobbies of interest.'} Select as many as you like. The first is your primary choice. You can skip this and edit it later.
      </Text>

      {loading && <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading sports and hobbies…</Text>}
      {error && <>
        <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>Sports and hobbies could not load. You can retry or continue without choosing.</Text>
        <VoltButton label="Retry sports and hobbies" onPress={retry} />
      </>}

      {/* Chosen first, in order, because the order is the meaning: the top one
          is what someone is primarily here for. Reordering is one tap on the
          row itself rather than a separate stack of "make X primary" links. */}
      {selected.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionHeading>Your choices · {selected.length}</SectionHeading>
          <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' }}>
            {selected.map((id, index) => {
              const sport = byId(id);
              const primary = index === 0;
              return (
                <Row key={id} gap={8} style={{ alignItems: 'center', minHeight: 52, paddingLeft: 12, paddingRight: 8,
                  backgroundColor: primary ? c.surface : 'transparent',
                  borderTopWidth: index === 0 ? 0 : 1, borderTopColor: c.line2 }}>
                  <Icon name="star" size={16} color={primary ? c.accent : c.txt3} />
                  <Text numberOfLines={1} style={[t.label, { flex: 1, color: c.txt }]}>{sport ? sport.name : 'Unavailable'}</Text>
                  {primary
                    ? <MicroBadge label="Primary" bg={c.volt} fg={c.ink} />
                    : <Pressable accessibilityRole="button" accessibilityLabel={`Make ${sport ? sport.name : 'this'} primary`}
                        onPress={() => promote(id)}
                        style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }}>
                        <Text style={[t.labelSm, { color: c.accent }]}>Make primary</Text>
                      </Pressable>}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${sport ? sport.name : 'this choice'}`}
                    onPress={() => drop(id)}
                    style={{ minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="x" size={18} color={c.txt3} />
                  </Pressable>
                </Row>
              );
            })}
          </View>
          {selected.length > 1 && (
            <Text style={[t.bodySm, { color: c.txt3 }]}>The starred choice is what people see first on your profile.</Text>
          )}
        </View>
      )}

      {sports.length > 0 && (
        <Field value={query} onChange={setQuery} icon="search"
          placeholder="Search sports and hobbies" label="Search sports and hobbies" />
      )}

      {!loading && !error && !sports.length && <Text style={[t.bodySm, { color: c.txt3 }]}>No sports or hobbies are available yet.</Text>}

      {sports.length > 0 && groups.length === 0 && (
        <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>
          {searching ? `Nothing else matches “${query.trim()}”.` : 'Everything available is already chosen.'}
        </Text>
      )}

      {groups.map((group) => {
        // Searching shows every match; otherwise a long group is previewed
        // until asked for in full.
        const open = searching || expanded.includes(group.label);
        const shown = open ? group.items : group.items.slice(0, PREVIEW);
        const hidden = group.items.length - shown.length;
        return (
          <View key={group.label} style={{ gap: 8 }}>
            <SectionHeading>{group.label}</SectionHeading>
            <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' }}>
              {shown.map((sport, index) => (
                  <Pressable key={sport.id} accessibilityRole="checkbox" accessibilityLabel={sport.name} accessibilityState={{ checked: false }}
                    onPress={() => pick(sport.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12,
                      borderTopWidth: index === 0 ? 0 : 1, borderTopColor: c.line2 }}>
                    <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: c.line }} />
                    <Text numberOfLines={1} style={[t.label, { flex: 1, color: c.txt }]}>{sport.name}</Text>
                  </Pressable>
              ))}
            </View>
            {hidden > 0 && (
              <Pressable accessibilityRole="button" accessibilityLabel={`Show all ${group.items.length} ${group.label.toLowerCase()}`}
                onPress={() => setExpanded([...expanded, group.label])}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[t.labelSm, { color: c.accent }]}>Show {hidden} more {group.label.toLowerCase()}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}
