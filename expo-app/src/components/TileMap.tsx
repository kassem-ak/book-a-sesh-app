import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, PanResponder, Pressable, Text, View } from 'react-native';
import { GeoPoint } from '../lib/geo';
import { useTheme } from '../theme';

// A real slippy map, drawn from raster tiles with plain Views and Images.
//
// react-native-maps was the obvious choice and is the wrong one here: it has no
// web implementation, and the web build is where this app is being developed
// and shipped today. Web Mercator is about fifteen lines of arithmetic, and
// Image/View behave identically under react-native-web, so one component serves
// both platforms with no native module and no rebuild.
const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

// OpenStreetMap's public tile servers. Their usage policy allows modest
// application traffic with attribution, which is displayed below and must stay.
// Heavy or commercial traffic needs a paid provider -- swapping this one line
// is the whole migration.
const tileUrl = (x: number, y: number, z: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

/** Web Mercator, in world pixels at the given zoom. */
function project(point: GeoPoint, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const lat = Math.max(-85.05112878, Math.min(85.05112878, point.latitude));
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((point.longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number): GeoPoint {
  const scale = TILE * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return {
    longitude: (x / scale) * 360 - 180,
    latitude: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
  };
}

/** The zoom at which every point fits inside a box of `width` x `height`. */
export function zoomToFit(points: GeoPoint[], width: number, height: number, fallback = 13) {
  if (points.length < 2 || width <= 0 || height <= 0) return fallback;
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const projected = points.map((point) => project(point, zoom));
    const spanX = Math.max(...projected.map((p) => p.x)) - Math.min(...projected.map((p) => p.x));
    const spanY = Math.max(...projected.map((p) => p.y)) - Math.min(...projected.map((p) => p.y));
    if (spanX <= width * 0.8 && spanY <= height * 0.8) return zoom;
  }
  return MIN_ZOOM;
}

export type MapMarker = {
  key: string;
  point: GeoPoint;
  render: () => React.ReactNode;
  onPress?: () => void;
};

export function TileMap({ center, markers, initialZoom = 13, onRecenter }: {
  center: GeoPoint;
  markers: MapMarker[];
  initialZoom?: number;
  onRecenter?: () => void;
}) {
  const { c, t } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(initialZoom);
  const [focus, setFocus] = useState(center);
  // The gesture handler is created once, so it reads live values through a ref
  // rather than closing over the first render's state.
  const live = useRef({ focus, zoom, size });
  live.current = { focus, zoom, size };

  // Follow an externally chosen centre (the user tapping "my location"), but
  // never yank the map back while they are panning.
  const centerKey = `${center.latitude},${center.longitude}`;
  const lastCenter = useRef(centerKey);
  useEffect(() => {
    if (lastCenter.current === centerKey) return;
    lastCenter.current = centerKey;
    setFocus(center);
  }, [centerKey, center]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.hypot(gesture.dx, gesture.dy) > 4,
    onPanResponderMove: (_event, gesture) => {
      const { focus: from, zoom: z } = live.current;
      const origin = project(from, z);
      setFocus(unproject(origin.x - gesture.dx, origin.y - gesture.dy, z));
    },
  }), []);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const centerPixel = project(focus, zoom);
  const originX = centerPixel.x - size.width / 2;
  const originY = centerPixel.y - size.height / 2;
  const tileCount = 2 ** zoom;

  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  if (size.width > 0 && size.height > 0) {
    const firstX = Math.floor(originX / TILE);
    const firstY = Math.floor(originY / TILE);
    const lastX = Math.floor((originX + size.width) / TILE);
    const lastY = Math.floor((originY + size.height) / TILE);
    for (let x = firstX; x <= lastX; x += 1) {
      for (let y = firstY; y <= lastY; y += 1) {
        // Wrap east-west so panning past the date line keeps drawing; skip
        // north-south, where there is no tile to wrap to.
        const wrappedX = ((x % tileCount) + tileCount) % tileCount;
        if (y < 0 || y >= tileCount) continue;
        tiles.push({
          key: `${zoom}/${x}/${y}`,
          url: tileUrl(wrappedX, y, zoom),
          left: x * TILE - originX,
          top: y * TILE - originY,
        });
      }
    }
  }

  const placed = markers
    .map((marker) => {
      const pixel = project(marker.point, zoom);
      return { marker, left: pixel.x - originX, top: pixel.y - originY };
    })
    .filter((entry) => entry.left > -80 && entry.top > -80
      && entry.left < size.width + 80 && entry.top < size.height + 80);

  const zoomBy = (delta: number) => setZoom((value) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value + delta)));
  const control = {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center' as const,
    justifyContent: 'center' as const, backgroundColor: c.bg, borderColor: c.line, borderWidth: 1,
  };

  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: c.surface }} onLayout={onLayout} {...pan.panHandlers}>
      {tiles.map((tile) => (
        <Image key={tile.key} source={{ uri: tile.url }} accessibilityIgnoresInvertColors
          style={{ position: 'absolute', left: tile.left, top: tile.top, width: TILE, height: TILE }} />
      ))}

      {placed.map(({ marker, left, top }) => (
        <View key={marker.key} style={{ position: 'absolute', left, top, transform: [{ translateX: -22 }, { translateY: -22 }] }}>
          {marker.onPress
            ? <Pressable accessibilityRole="button" onPress={marker.onPress}>{marker.render()}</Pressable>
            : marker.render()}
        </View>
      ))}

      <View style={{ position: 'absolute', right: 12, bottom: 34, gap: 8 }}>
        {onRecenter && (
          <Pressable accessibilityRole="button" accessibilityLabel="Centre the map on my location" onPress={onRecenter} style={control}>
            <Text style={[t.label, { color: c.accent }]}>◎</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => zoomBy(1)} style={control}>
          <Text style={[t.label, { color: c.txt }]}>+</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => zoomBy(-1)} style={control}>
          <Text style={[t.label, { color: c.txt }]}>−</Text>
        </Pressable>
      </View>

      {/* OpenStreetMap's licence requires visible attribution. */}
      <Text style={[t.caption, { position: 'absolute', left: 8, bottom: 6, color: c.txt3, fontSize: 9 }]}>
        © OpenStreetMap contributors
      </Text>
    </View>
  );
}
