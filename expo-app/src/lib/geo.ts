export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type MapPoint = {
  top: number;
  left: number;
};

type ExpoLocationModule = {
  Accuracy?: {
    Balanced?: number;
  };
  requestForegroundPermissionsAsync: () => Promise<{ granted?: boolean; status?: string }>;
  getCurrentPositionAsync: (options?: { accuracy?: number }) => Promise<{
    coords?: {
      latitude?: number;
      longitude?: number;
    };
  }>;
};

let cachedDevicePoint: GeoPoint | null | undefined;
let pendingDevicePoint: Promise<GeoPoint | null> | null = null;

function locationModule() {
  return require('expo-location') as ExpoLocationModule;
}

function toFiniteNumber(value: unknown) {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function asPoint(latitude: unknown, longitude: unknown): GeoPoint | null {
  const lat = toFiniteNumber(latitude);
  const lon = toFiniteNumber(longitude);
  if (lat === null || lon === null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}

function parseCoordinateArray(value: unknown): GeoPoint | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  return asPoint(value[1], value[0]);
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function readUint32(bytes: Uint8Array, offset: number, littleEndian: boolean) {
  if (offset + 4 > bytes.length) return null;
  if (littleEndian) {
    return ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>> 0;
  }
  return ((((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)) >>> 0);
}

function readFloat64(bytes: Uint8Array, offset: number, littleEndian: boolean) {
  if (offset + 8 > bytes.length) return null;
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i += 1) view.setUint8(i, bytes[offset + i] ?? 0);
  const value = view.getFloat64(0, littleEndian);
  return Number.isFinite(value) ? value : null;
}

function parseEwkbPoint(value: string): GeoPoint | null {
  const hex = value.trim();
  if (hex.length < 42 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;

  const bytes = hexToBytes(hex);
  const littleEndian = bytes[0] === 1;
  if (!littleEndian && bytes[0] !== 0) return null;

  let offset = 1;
  const rawType = readUint32(bytes, offset, littleEndian);
  if (rawType === null) return null;
  offset += 4;

  const hasSrid = (rawType & 0x20000000) !== 0;
  const geometryType = rawType & 0xffff;
  if (geometryType !== 1) return null;
  if (hasSrid) offset += 4;

  const longitude = readFloat64(bytes, offset, littleEndian);
  const latitude = readFloat64(bytes, offset + 8, littleEndian);
  return asPoint(latitude, longitude);
}

function parsePointString(value: string): GeoPoint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return parseGeoPoint(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }

  const match = trimmed.match(/^(?:SRID=\d+;)?POINT(?:\s+Z|\s+M|\s+ZM)?\s*\(\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/i);
  if (match) return asPoint(match[2], match[1]);

  return parseEwkbPoint(trimmed);
}

export function parseGeoPoint(value: unknown): GeoPoint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return parsePointString(value);
  if (Array.isArray(value)) return parseCoordinateArray(value);
  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if ('location' in record) return parseGeoPoint(record.location);
  if ('coords' in record) return parseGeoPoint(record.coords);
  if ('geometry' in record) return parseGeoPoint(record.geometry);
  if ('coordinates' in record) return parseCoordinateArray(record.coordinates);

  return asPoint(
    record.latitude ?? record.lat,
    record.longitude ?? record.long ?? record.lng ?? record.lon,
  );
}

export async function getDevicePoint(): Promise<GeoPoint | null> {
  if (cachedDevicePoint !== undefined) return cachedDevicePoint;
  if (pendingDevicePoint) return pendingDevicePoint;

  pendingDevicePoint = (async () => {
    try {
      const Location = locationModule();
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted !== true && permission.status !== 'granted') return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy?.Balanced,
      });
      return asPoint(location.coords?.latitude, location.coords?.longitude);
    } catch {
      // Permission denial, native unavailability, and missing installs all mean "unknown".
      return null;
    }
  })();

  cachedDevicePoint = await pendingDevicePoint;
  pendingDevicePoint = null;
  return cachedDevicePoint;
}

export function distanceKmBetween(from: GeoPoint | null | undefined, to: GeoPoint | null | undefined) {
  if (!from || !to) return null;

  const earthRadiusKm = 6371.0088;
  const fromLat = (from.latitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;
  const latDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const lonDelta = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);
  const distance = earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number.isFinite(distance) ? distance : null;
}

export function formatDistanceKm(distanceKm: number | null | undefined) {
  if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm) || distanceKm < 0) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${Math.round(distanceKm * 10) / 10} km`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function mapPointToPercent(point: GeoPoint, points: GeoPoint[], anchor?: GeoPoint | null): MapPoint | null {
  const all = [...points, anchor].filter((p): p is GeoPoint => Boolean(p));
  if (all.length === 0) return null;

  const minLat = Math.min(...all.map((p) => p.latitude));
  const maxLat = Math.max(...all.map((p) => p.latitude));
  const minLon = Math.min(...all.map((p) => p.longitude));
  const maxLon = Math.max(...all.map((p) => p.longitude));
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lonSpan = Math.max(maxLon - minLon, 0.01);

  return {
    top: clamp(50 - ((point.latitude - centerLat) / latSpan) * 76, 10, 90),
    left: clamp(50 + ((point.longitude - centerLon) / lonSpan) * 76, 10, 90),
  };
}
