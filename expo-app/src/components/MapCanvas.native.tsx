import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../theme';
import { IconButton } from './ui';
import type { MapCanvasProps } from './MapCanvas';
import { TileMap } from './TileMap';

export type { MapMarker } from './TileMap';

// Google Maps on iOS and Android, where the Maps SDKs are free with no monthly
// cap. Metro picks this file on native and MapCanvas.tsx (the raster TileMap)
// on web, because react-native-maps has no web build.
//
// Google's terms forbid rendering their tiles in a non-Google renderer, so this
// could never have been a URL swapped into TileMap -- it has to be their SDK.
//
// Without a key, react-native-maps draws a blank grey square and reports
// "Authorization failure" only to the device log. That is indistinguishable
// from a broken app. The raster TileMap already works on every platform, so an
// unconfigured build falls back to it and the map works either way -- Google is
// an upgrade, not a prerequisite.
// Set by app.config.js from GOOGLE_MAPS_API_KEY at build time. Read from the
// app config rather than process.env because Metro inlines EXPO_PUBLIC_* from
// whatever environment the bundler subprocess has, and Gradle's embed step did
// not have it: the value silently became undefined and the map fell back to
// raster tiles in a build that looked correct everywhere else.
const GOOGLE_MAPS_CONFIGURED = Constants.expoConfig?.extra?.googleMapsConfigured === true;

/** Google's own dark style, tuned to the app palette rather than its stock dark
 *  theme, so the map reads as part of BOOK'D instead of a Google surface
 *  embedded in it. Water and land take the app's background tones; labels take
 *  the app's muted text colours. */
const darkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#16181D' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0D0E11' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9BA1AC' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3A3F47' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1C1F26' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22252C' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2C313A' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1C1F26' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A0B0D' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3A3F47' }] },
];

/** A slippy-map zoom level expressed as the region span react-native-maps wants.
 *  One zoom level halves the span, which is the same relationship the tile
 *  pyramid uses, so a zoom means the same thing on both platforms. */
const spanForZoom = (zoom: number) => 360 / 2 ** zoom;

export function MapCanvas(props: MapCanvasProps) {
  if (!GOOGLE_MAPS_CONFIGURED) return <TileMap {...props} />;
  return <GoogleMap {...props} />;
}

function GoogleMap({ center, markers, initialZoom = 13, onRecenter }: MapCanvasProps) {
  const { c, t } = useTheme();
  const map = useRef<MapView>(null);

  // Follow an externally chosen centre -- the user tapping "my location" --
  // without fighting them while they pan, which is why this keys on the value
  // rather than running on every render.
  const centerKey = `${center.latitude},${center.longitude}`;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return; // initialRegion already placed it
    }
    map.current?.animateCamera({ center }, { duration: 400 });
  }, [centerKey, center]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={map}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        customMapStyle={c.isDark ? darkStyle : []}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: spanForZoom(initialZoom),
          longitudeDelta: spanForZoom(initialZoom),
        }}
        // Our own marker already shows where the user is, and the stock blue dot
        // beside it would read as two different answers to the same question.
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        // Google draws its own required attribution; nothing to add.
      >
        {markers.map((marker) => (
          <Marker
            key={marker.key}
            coordinate={marker.point}
            onPress={marker.onPress}
            tracksViewChanges={false}
          >
            {marker.render()}
          </Marker>
        ))}
      </MapView>

      {onRecenter && (
        <IconButton icon="crosshair" accessibilityLabel="Centre the map on my location"
          onPress={onRecenter}
          style={{ position: 'absolute', right: 12, bottom: 34, backgroundColor: c.bg }} />
      )}
      {/* No zoom buttons: pinch is the native gesture, and duplicating it in
          chrome would be web habit imported onto a phone. */}
    </View>
  );
}
