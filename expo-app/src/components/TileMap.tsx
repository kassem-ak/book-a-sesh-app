import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, PanResponder, Pressable, Text, View } from 'react-native';
import { GeoPoint } from '../lib/geo';
import { IconButton } from './ui';
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

// The basemap defaults to CARTO, which publishes matched dark and light styles
// of OpenStreetMap data. Standard OSM tiles are a bright paper map, which made
// the map the one surface ignoring a near-black app; CARTO lets it follow the
// theme both ways.
//
// CARTO and OSM both serve these without a key, but both intend that for modest
// use: a real product at volume is expected to hold an account. So the provider
// is configuration, not code. Set these to any XYZ template -- MapTiler, Stadia,
// Thunderforest, a self-hosted server -- with the key already in the URL:
//
//   EXPO_PUBLIC_MAP_TILES_DARK=https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=YOUR_KEY
//   EXPO_PUBLIC_MAP_TILES_LIGHT=https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY
//   EXPO_PUBLIC_MAP_ATTRIBUTION=© MapTiler © OpenStreetMap contributors
//
// EXPO_PUBLIC_* values are inlined into the published bundle and are readable by
// anyone who opens it. That is unavoidable for a client-side map and is why
// every provider expects such keys to be restricted by HTTP referrer in their
// dashboard. Restrict yours to www.app-bookd.com, or it can be used on any site.
export type MapTheme = 'dark' | 'light';

const DEFAULT_TILES = {
  dark: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  light: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
};

export const MAP_ATTRIBUTION =
  process.env.EXPO_PUBLIC_MAP_ATTRIBUTION || '© OpenStreetMap contributors © CARTO';

const template = (theme: MapTheme) =>
  (theme === 'dark'
    ? process.env.EXPO_PUBLIC_MAP_TILES_DARK
    : process.env.EXPO_PUBLIC_MAP_TILES_LIGHT) || DEFAULT_TILES[theme];

const tileUrl = (x: number, y: number, z: number, theme: MapTheme) =>
  template(theme)
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));

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
  /** Required whenever the pin is pressable. The marker draws an avatar, so
   *  without this a screen reader announced two initials and nothing else --
   *  no name, no role, no sport. */
  label?: string;
};

export function TileMap({ center, markers, initialZoom = 13, onRecenter }: {
  center: GeoPoint;
  markers: MapMarker[];
  initialZoom?: number;
  onRecenter?: () => void;
}) {
  const { c, t } = useTheme();
  const mapTheme: MapTheme = c.isDark ? 'dark' : 'light';
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
          url: tileUrl(wrappedX, y, zoom, mapTheme),
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
  // The map's own controls sit on the map rather than on a surface, so they
  // keep the page background instead of IconButton's card colour.
  const control = { backgroundColor: c.bg };

  return (
    // mapBg is the theme's own token for map canvas, so the gap before tiles
    // load is the app's colour rather than a flash of grey.
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: c.mapBg }} onLayout={onLayout} {...pan.panHandlers}>
      {tiles.map((tile) => (
        <Image key={tile.key} source={{ uri: tile.url }} accessibilityIgnoresInvertColors
          style={{ position: 'absolute', left: tile.left, top: tile.top, width: TILE, height: TILE }} />
      ))}

      {placed.map(({ marker, left, top }) => (
        <View key={marker.key} style={{ position: 'absolute', left, top, transform: [{ translateX: -22 }, { translateY: -22 }] }}>
          {marker.onPress
            ? (
              <Pressable accessibilityRole="button" accessibilityLabel={marker.label}
                onPress={marker.onPress}>
                {marker.render()}
              </Pressable>
            )
            : marker.render()}
        </View>
      ))}

      <View style={{ position: 'absolute', right: 12, bottom: 34, gap: 8 }}>
        {onRecenter && (
          <IconButton icon="crosshair" accessibilityLabel="Centre the map on my location"
            onPress={onRecenter} style={control} />
        )}
        <IconButton icon="plus" accessibilityLabel="Zoom in" onPress={() => zoomBy(1)} style={control} />
        <IconButton icon="minus" accessibilityLabel="Zoom out" onPress={() => zoomBy(-1)} style={control} />
      </View>

      {/* Every tile provider's licence requires visible attribution, so this
          moves with the provider rather than being hardcoded to one. */}
      <Text style={[t.caption, { position: 'absolute', left: 8, bottom: 6, color: c.txt3, fontSize: 9 }]}>
        {MAP_ATTRIBUTION}
      </Text>
    </View>
  );
}
