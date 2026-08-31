import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Avatar, Card, Icon, MicroBadge, Row } from '../components/ui';
import { Person, initials, personMeta } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

const MAP_H = 460;
// pseudo pin positions (% of map) for up to 6 people
const POS = [
  { top: 30, left: 46 },
  { top: 22, left: 20 },
  { top: 55, left: 30 },
  { top: 62, left: 66 },
  { top: 40, left: 76 },
  { top: 74, left: 50 },
];

function Grid({ color }: { color: string }) {
  return (
    <Svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Line key={`v${i}`} x1={`${i * 16.6}%`} y1="0" x2={`${i * 16.6}%`} y2="100%" stroke={color} strokeWidth={1} />
      ))}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Line key={`h${i}`} x1="0" y1={`${i * 14}%`} x2="100%" y2={`${i * 14}%`} stroke={color} strokeWidth={1} />
      ))}
    </Svg>
  );
}

export function DiscoverMap({ people }: { people: Person[] }) {
  const { c, t } = useTheme();
  const s = useStore();
  const nearest = [...people].sort((a, b) => a.distance - b.distance)[0];
  return (
    <View>
      <View style={{ height: MAP_H, borderRadius: 18, backgroundColor: c.mapBg, borderColor: c.line, borderWidth: 1, overflow: 'hidden' }}>
        <Grid color={c.grid} />
        {/* user location — board annotation: "blinking marker" */}
        <View style={{ position: 'absolute', top: '48%', left: '50%', marginLeft: -17, marginTop: -17 }}>
          <BlinkingMarker />
        </View>
        {people.slice(0, 6).map((p, i) => {
          const pos = POS[i];
          return (
            <Pressable
              key={p.id}
              onPress={() => s.openPerson(p.id)}
              style={{ position: 'absolute', top: `${pos.top}%`, left: `${pos.left}%`, alignItems: 'center' }}
            >
              <View style={{ position: 'relative' }}>
                <View
                  style={{
                    borderRadius: 999,
                    borderWidth: 2,
                    // spec: boosted = filled amber, others = volt outline
                    borderColor: p.boosted ? c.amber : c.volt,
                    backgroundColor: p.boosted ? c.amber : 'transparent',
                    padding: p.boosted ? 2 : 0,
                  }}
                >
                  <Avatar initials={initials(p.name)} size={44} radius={999} />
                </View>
                {p.boosted && (
                  <View style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: c.amber, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="zap" size={10} color={c.ink} />
                  </View>
                )}
              </View>
              <View style={{ marginTop: 4, backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={[t.caption, { color: c.txt }]}>★ {p.rating.toFixed(1)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* docked nearest card */}
      {nearest && (
        <View style={{ marginTop: -74, marginHorizontal: 10 }}>
          <Card onPress={() => s.openPerson(nearest.id)} style={{ padding: 12 }}>
            <Row gap={12}>
              <Avatar initials={initials(nearest.name)} size={48} radius={13} />
              <View style={{ flex: 1 }}>
                <Text style={[t.name, { color: c.txt }]}>{nearest.name}</Text>
                <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{personMeta(nearest)}</Text>
              </View>
              {nearest.isCoach ? (
                <Text style={[t.price, { color: c.accent }]}>${nearest.price}</Text>
              ) : (
                <MicroBadge label={nearest.level} bg={c.surface2} fg={c.txt2} />
              )}
            </Row>
          </Card>
        </View>
      )}
    </View>
  );
}

// Board annotation: "blinking marker" on the user's location.
export function BlinkingMarker() {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 34,
          height: 34,
          borderRadius: 999,
          backgroundColor: c.volt,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
        }}
      />
      <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: c.volt, borderWidth: 3, borderColor: alpha(c.volt, 0.3) }} />
    </View>
  );
}
