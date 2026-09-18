import React from 'react';
import { GeoPoint } from '../lib/geo';
import { MapMarker, TileMap } from './TileMap';

// The web implementation. Metro picks MapCanvas.native.tsx on iOS and Android,
// and this file everywhere else.
//
// react-native-maps has no web support at all -- it is Android and iOS only --
// so Google Maps cannot be the single renderer even if we wanted it to be. The
// alternative was Google's Maps JavaScript API on web, which bills $7 per 1,000
// map loads past 10,000 a month. The raster TileMap already works, costs
// nothing, and web is the development surface rather than the product, so it
// stays. The contract below is what keeps them interchangeable.
export type { MapMarker } from './TileMap';

export type MapCanvasProps = {
  center: GeoPoint;
  markers: MapMarker[];
  initialZoom?: number;
  onRecenter?: () => void;
};

export function MapCanvas(props: MapCanvasProps) {
  return <TileMap {...props} />;
}
