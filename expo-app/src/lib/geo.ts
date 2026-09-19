export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type MapPoint = {
  top: number;
  left: number;
};

type ReverseGeocoded = {
  city?: string | null;
  district?: string | null;
  subregion?: string | null;
  region?: string | null;
  country?: string | null;
};

type ExpoLocationModule = {
  Accuracy?: {
    Balanced?: number;
    High?: number;
  };
  requestForegroundPermissionsAsync: () => Promise<{ granted?: boolean; status?: string }>;
  getCurrentPositionAsync: (options?: { accuracy?: number }) => Promise<{
    coords?: {
      latitude?: number;
      longitude?: number;
    };
  }>;
  reverseGeocodeAsync?: (point: GeoPoint) => Promise<ReverseGeocoded[]>;
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

/** Ask for the device point again, ignoring a cached answer.
 *
 *  `getDevicePoint` caches a `null` for the whole session, which is right for
 *  background use -- it stops every screen re-prompting. But it also means a
 *  user who declined once, or who had location off, could never turn sharing on
 *  without restarting the app. An explicit tap is a fresh question.
 *
 *  `precise` asks for the best fix the OS will give. Everything else in the app
 *  wants Balanced: it is cheaper, and approximate is all a distance sort needs.
 *  Only a user explicitly choosing to drop a pin justifies the higher accuracy,
 *  and the OS may still hand back a coarse fix if they granted only
 *  approximate -- which is their decision to make, not one to work around. */
export async function refreshDevicePoint(precise = false): Promise<GeoPoint | null> {
  cachedDevicePoint = undefined;
  pendingDevicePoint = null;
  if (!precise) return getDevicePoint();

  try {
    const Location = locationModule();
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.granted !== true && permission.status !== 'granted') return null;
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy?.High ?? Location.Accuracy?.Balanced,
    });
    const point = asPoint(location.coords?.latitude, location.coords?.longitude);
    cachedDevicePoint = point;
    return point;
  } catch {
    return null;
  }
}

/** Round to ~110 m before anything stores or sends a position.
 *
 *  PRIVACY.md promises approximate location only. `Accuracy.Balanced` is
 *  already coarse, but it still returns full float precision, and a stored
 *  full-precision point would make that promise untrue in the database
 *  regardless of how it was captured. */
export function coarsenPoint(point: GeoPoint): GeoPoint {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return { latitude: round(point.latitude), longitude: round(point.longitude) };
}

// ---- naming a position ------------------------------------------------------

/** Turn a position into "City, Country".
 *
 *  Two sources, in order. On a phone `expo-location` asks the operating
 *  system's own geocoder: no key, no account, and Apple or Google already knows
 *  where the device is. The web build has no such geocoder -- Expo dropped it
 *  because the browser has no equivalent -- so it falls back to a keyless HTTP
 *  service.
 *
 *  Either way the COARSENED point is what gets sent. A city name does not need
 *  110 m of precision, and the promise in PRIVACY.md is easier to keep if the
 *  exact fix never leaves the device at all.
 *
 *  Returns null rather than throwing on every failure: a missing area is a
 *  field the person can still type into, not an error worth a red banner.
 */
export async function describePoint(point: GeoPoint): Promise<string | null> {
  const coarse = coarsenPoint(point);
  return (await osPlaceName(coarse)) ?? (await webPlaceName(coarse));
}

/** "Beirut, Lebanon" from whatever subset of fields a geocoder returned.
 *
 *  `city` is missing surprisingly often -- rural addresses, some countries'
 *  data, and iOS outside built-up areas -- so district, subregion and region
 *  stand in, in decreasing order of how much they sound like a place you would
 *  tell someone you train in. A country on its own is still better than a blank
 *  field.
 */
function placeName(place: ReverseGeocoded | null | undefined): string | null {
  if (!place) return null;
  const locality = [place.city, place.district, place.subregion, place.region]
    .map((value) => value?.trim())
    .find((value) => Boolean(value));
  const country = place.country?.trim();
  return [locality, country].filter(Boolean).join(', ') || null;
}

async function osPlaceName(point: GeoPoint): Promise<string | null> {
  try {
    const Location = locationModule();
    if (!Location.reverseGeocodeAsync) return null;
    const results = await Location.reverseGeocodeAsync(point);
    return placeName(results?.[0]);
  } catch {
    // Not available on this platform, or the geocoder is offline.
    return null;
  }
}

// Keyless and CORS-enabled, which is what makes it usable from the web build
// without shipping a credential in the bundle. Only ever reached when the OS
// geocoder is absent.
const WEB_GEOCODER = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

async function webPlaceName(point: GeoPoint): Promise<string | null> {
  try {
    const url = `${WEB_GEOCODER}?latitude=${point.latitude}&longitude=${point.longitude}&localityLanguage=en`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const body = (await response.json()) as {
      city?: string; locality?: string; principalSubdivision?: string; countryName?: string;
    };
    return placeName({
      city: body.city || body.locality,
      region: body.principalSubdivision,
      country: body.countryName,
    });
  } catch {
    return null;
  }
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
