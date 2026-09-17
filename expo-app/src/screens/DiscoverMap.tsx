import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';
import { Avatar, Row } from '../components/ui';
import { distanceKmBetween, formatDistanceKm, GeoPoint, getDevicePoint, mapPointToPercent, MapPoint, parseGeoPoint } from '../lib/geo';
import { Person, initials } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

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

function Grid() {
  const { c } = useTheme();
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="map-background" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.isDark ? '#15171C' : '#E3E5EB'} />
          <Stop offset="1" stopColor={c.isDark ? '#08090B' : '#C7CAD2'} />
        </LinearGradient>
        <Pattern id="map-grid" width={30} height={30} patternUnits="userSpaceOnUse">
          <Path d="M 30 0 L 0 0 0 30" fill="none" stroke={c.grid} strokeWidth={1} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#map-background)" />
      <Rect width="100%" height="100%" fill="url(#map-grid)" />
    </Svg>
  );
}

export function DiscoverMap({ people, emptyMessage }: { people: Person[]; emptyMessage?: string }) {
  const { c, t } = useTheme();
  const s = useStore();
  const [devicePoint, setDevicePoint] = useState<GeoPoint | null | undefined>(undefined);
  const coordinatePeople = people
    .map((person) => {
      const coordinates = personCoordinates(person);
      return coordinates ? { person, coordinates } : null;
    })
    .filter((entry): entry is CoordinatePerson => Boolean(entry));
  useEffect(() => {
    let active = true;
    getDevicePoint().then((point) => {
      if (active) setDevicePoint(point);
    });
    return () => {
      active = false;
    };
  }, []);

  const inRange = coordinatePeople.filter((entry) => {
    const distance = distanceKmBetween(devicePoint, entry.coordinates);
    return distance === null || distance <= s.searchRadius;
  });
  const coordinatePoints = inRange.map((entry) => entry.coordinates);
  const pins = inRange
    .map((entry) => {
      const mapPoint = mapPointToPercent(entry.coordinates, coordinatePoints, devicePoint ?? null);
      if (!mapPoint) return null;
      const distanceKm = distanceKmBetween(devicePoint ?? null, entry.coordinates);
      return { ...entry, mapPoint, distanceKm, distanceLabel: formatDistanceKm(distanceKm) };
    })
    .filter((entry): entry is PersonPin => Boolean(entry));
  const userMapPoint = devicePoint ? mapPointToPercent(devicePoint, coordinatePoints, devicePoint) : null;
  const nearest = pins
    .filter((entry) => entry.person.boosted && entry.distanceKm !== null)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))[0];

  return (
    <View style={{ flex: 1, backgroundColor: c.mapBg }}>
      <Grid />
      <View style={{ position: 'absolute', top: 140, bottom: nearest ? 116 : 32, left: 30, right: 30 }}>
        {userMapPoint && <View style={{ position: 'absolute', top: `${userMapPoint.top}%`, left: `${userMapPoint.left}%`, marginLeft: -7, marginTop: -7 }}><BlinkingMarker /></View>}
        {pins.map(({ person: p, mapPoint }) => (
          <Pressable key={`${p.id}:${p.isCoach}`} onPress={() => s.openPerson(p.id)} accessibilityRole="button" accessibilityLabel={`${p.name} on map`}
            style={{ position: 'absolute', top: `${mapPoint.top}%`, left: `${mapPoint.left}%`, marginLeft: -27, marginTop: -27 }}>
            <View style={{ width: 54, height: 54, borderRadius: 999, borderWidth: 2, borderColor: c.volt, backgroundColor: p.boosted ? c.amber : c.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[t.label, { color: p.boosted ? c.ink : c.txt }]}>{initials(p.name)}</Text>
            </View>
            {p.reviews > 0 && <View style={{ position: 'absolute', top: 0, left: 43, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={[t.microBadge, { color: c.amberText }]}>{p.rating.toFixed(1)}</Text>
            </View>}
          </Pressable>
        ))}
        {pins.length === 0 && <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: userMapPoint ? 'flex-end' : 'center', paddingHorizontal: 28, paddingBottom: 18 }}>
          <Text accessibilityRole="text" style={[t.bodySm, { color: c.txt2, textAlign: 'center' }]}>
            {coordinatePeople.length > 0 && inRange.length === 0 ? `No profiles within ${s.searchRadius} km.` : emptyMessage ?? 'No public map locations available yet.'}
          </Text>
        </View>}
      </View>
      {nearest && <Pressable onPress={() => s.openPerson(nearest.person.id)} accessibilityRole="button" accessibilityLabel={`Nearest boosted coach: ${nearest.person.name}`}
        style={{ position: 'absolute', bottom: 22, left: 30, right: 22 }}>
        <Row gap={14}>
          <Avatar initials={initials(nearest.person.name)} avatarUrl={nearest.person.avatarUrl} size={56} radius={16} bg={alpha(c.amber, 0.18)} />
          <View style={{ flex: 1 }}>
            <Text style={[t.caption, { color: c.txt3, letterSpacing: 1 }]}>Nearest boosted coach</Text>
            <Text style={[t.name, { color: c.txt, marginTop: 6 }]}>{nearest.person.name}</Text>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>{personMetaLabel(nearest.person, nearest.distanceLabel)} - ${nearest.person.price}</Text>
          </View>
        </Row>
      </Pressable>}
    </View>
  );
}

export function BlinkingMarker() {
  const { c } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    // A rejection here is not worth surfacing, but it must not become an
    // unhandled rejection either; the listener below still corrects the value.
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (active) setReduceMotion(value); })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const blink = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) { blink.setValue(0); pulse.setValue(0); return; }
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    const pulseLoop = Animated.loop(Animated.timing(pulse, {
      toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }));
    blinkLoop.start();
    pulseLoop.start();
    return () => { blinkLoop.stop(); pulseLoop.stop(); };
  }, [blink, pulse, reduceMotion]);
  return (
    <View accessible accessibilityLabel="Your current location" style={{ alignItems: 'center', justifyContent: 'center' }}>
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
      <Animated.View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: c.volt, borderWidth: 3, borderColor: alpha(c.volt, 0.3), opacity: blink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }), transform: [{ scale: blink.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }} />
    </View>
  );
}
