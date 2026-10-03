import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SportCategory } from '../lib/profiles';
import { alpha, radii, useTheme } from '../theme';
import { Row } from './ui';

// Where a requested sport or hobby belongs, picked by the member.
//
// Only shown when the AI engine is off -- when it is on, the engine assigns the
// category itself and nobody is asked. Either way every request reaches an
// admin already placed, so the review is "is this right?" rather than "where
// does this go?".
//
// Choosing a category also settles sport-or-hobby, so there is no separate
// question for that: Music is a hobby, Combat sports is a sport.

export function CategoryChooser({ categories, selected, onPick, disabled = false }: {
  categories: SportCategory[];
  selected: string | null;
  onPick: (category: SportCategory) => void;
  disabled?: boolean;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {(['sport', 'hobby'] as const).map((kind) => {
        const ofKind = categories.filter((category) => category.kind === kind);
        if (!ofKind.length) return null;
        return (
          <View key={kind} style={{ gap: 8 }}>
            <Text style={[t.caption, { color: c.txt3 }]}>{kind === 'sport' ? 'A sport' : 'A hobby'}</Text>
            <Row style={{ flexWrap: 'wrap', gap: 8 }}>
              {ofKind.map((category) => {
                const on = selected === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => onPick(category)}
                    disabled={disabled}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on, disabled }}
                    accessibilityLabel={`${category.name}, a ${kind}`}
                    style={{
                      minHeight: 44, justifyContent: 'center', paddingHorizontal: 14,
                      borderRadius: radii.pill ?? 999, borderWidth: 1,
                      borderColor: on ? c.volt : c.line,
                      backgroundColor: on ? alpha(c.volt, 0.14) : c.surface,
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    <Text style={[t.labelSm, { color: on ? c.accent : c.txt2 }]}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </Row>
          </View>
        );
      })}
    </View>
  );
}
