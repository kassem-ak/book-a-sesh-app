import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Avatar, Card, Icon, MicroBadge, Row } from '../components/ui';
import { distanceKmBetween, formatDistanceKm, GeoPoint, getDevicePoint, mapPointToPercent, MapPoint, parseGeoPoint } from '../lib/geo';
import { Person, initials } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

const MAP_H = 460;

type GeoPerson = Person & {
  coordinates?: GeoPoint | null;
};

type CoordinatePerson = {
  person: Person;
  coordinates: GeoPoint;
};

type PersonPin = CoordinatePerson & {
  mapPoint: MapPoint;
  distanceKm: number | null;
  distanceLabel: string | null;
};

function personCoordinates(p: Person) {
  return parseGeoPoint((p as GeoPerson).coordinates ?? p);
}

function personMetaLabel(p: Person, distanceLabel?: string | null) {
  const parts = p.isCoach ? [p.sport] : [p.sport, p.goal ?? ''];
  if (distanceLabel) parts.push(distanceLabel);
  return parts.filter(Boolean).join(' - ');
}

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
  const [devicePoint, setDevicePoint] = useState<GeoPoint | null | undefined>(undefined);
  const coordinatePeople = people
    .map((person) => {
      const coordinates = personCoordinates(person);
      return coordinates ? { person, coordinates } : null;
    })
    .filter((entry): entry is CoordinatePerson => Boolean(entry));
  const coordinateKey = coordinatePeople.map((entry) => `${entry.person.id}:${entry.coordinates.latitude},${entry.coordinates.longitude}`).join('|');

  useEffect(() => {
    if (coordinatePeople.length === 0) {
      setDevicePoint(null);
      return;
    }

    let active = true;
    getDevicePoint().then((point) => {
      if (active) setDevicePoint(point);
    });
    return () => {
      active = false;
    };
  }, [coordinateKey, coordinatePeople.length]);

  const coordinatePoints = coordinatePeople.map((entry) => entry.coordinates);
  const pins = coordinatePeople
    .slice(0, 6)
    .map((entry) => {
      const mapPoint = mapPointToPercent(entry.coordinates, coordinatePoints, devicePoint ?? null);
      if (!mapPoint) return null;
      const distanceKm = distanceKmBetween(devicePoint ?? null, entry.coordinates);
      return { ...entry, mapPoint, distanceKm, distanceLabel: formatDistanceKm(distanceKm) };
    })
    .filter((entry): entry is PersonPin => Boolean(entry));
  const userMapPoint = devicePoint ? mapPointToPercent(devicePoint, coordinatePoints, devicePoint) : null;
  const nearest = pins
    .filter((entry) => entry.distanceKm !== null)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))[0];

  return (
    <View>
      <View style={{ height: MAP_H, borderRadius: 18, backgroundColor: c.mapBg, borderColor: c.line, borderWidth: 1, overflow: 'hidden' }}>
        <Grid color={c.grid} />
        {userMapPoint ? (
          <View style={{ position: 'absolute', top: `${userMapPoint.top}%`, left: `${userMapPoint.left}%`, marginLeft: -17, marginTop: -17 }}>
            <BlinkingMarker />
          </View>
        ) : null}
        {pins.map(({ person: p, mapPoint }) => (
          <Pressable
            key={p.id}
            onPress={() => s.openPerson(p.id)}
            accessibilityRole="button"
            accessibilityLabel={`${p.name} on map`}
            style={{ position: 'absolute', top: `${mapPoint.top}%`, left: `${mapPoint.left}%`, alignItems: 'center' }}
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
              <Row gap={3}>
                <Icon name="star" size={10} color={c.txt} />
                <Text style={[t.caption, { color: c.txt }]}>{p.rating.toFixed(1)}</Text>
              </Row>
            </View>
          </Pressable>
        ))}
      </View>

      {nearest && (() => {
        const p = nearest.person;
        return (
          <View style={{ marginTop: -74, marginHorizontal: 10 }}>
            <Card onPress={() => s.openPerson(p.id)} style={{ padding: 12 }}>
              <Row gap={12}>
                <Avatar initials={initials(p.name)} size={48} radius={13} />
                <View style={{ flex: 1 }}>
                  <Text style={[t.name, { color: c.txt }]}>{p.name}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{personMetaLabel(p, nearest.distanceLabel)}</Text>
                </View>
                {p.isCoach ? (
                  <Text style={[t.price, { color: c.accent }]}>${p.price}</Text>
                ) : (
                  <MicroBadge label={p.level} bg={c.surface2} fg={c.txt2} />
                )}
              </Row>
            </Card>
          </View>
        );
      })()}
    </View>
  );
}

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
