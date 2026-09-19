// Run: node tests/area-from-gps.test.cjs
// Naming the place a GPS fix landed in. What can go wrong is not the fix -- the
// OS gives that -- but what happens around a geocoder that answers partially,
// differently per country, or not at all: a blank area, a stray comma, a
// "undefined, Lebanon", or the exact position being sent to a third party when
// a rounded one would have done.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const BEIRUT = { latitude: 33.8937913, longitude: 35.5017767 };

function harness({ osResults = null, osThrows = false, web = null } = {}) {
  const sent = { os: [], web: [] };

  const Location = {
    Accuracy: { Balanced: 3, High: 5 },
    requestForegroundPermissionsAsync: async () => ({ granted: true }),
    getCurrentPositionAsync: async () => ({ coords: BEIRUT }),
  };
  // `undefined` models a platform where Expo ships no geocoder at all (web).
  if (osResults !== null || osThrows) {
    Location.reverseGeocodeAsync = async (point) => {
      sent.os.push(point);
      if (osThrows) throw new Error('geocoder unavailable');
      return osResults;
    };
  }

  const fetchStub = async (url) => {
    sent.web.push(String(url));
    if (!web) return new Response('', { status: 503 });
    return new Response(JSON.stringify(web), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const filename = join(__dirname, '../src/lib/geo.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (id) => {
      assert.equal(id, 'expo-location', `Unexpected import: ${id}`);
      return Location;
    },
    fetch: fetchStub,
    URL, Response, Headers, Promise, Array, Object, JSON, Math, Number, DataView, ArrayBuffer, Uint8Array, parseInt,
  }, { filename });
  return { module: exports, sent };
}

test('a city and a country become "City, Country"', async () => {
  const h = harness({ osResults: [{ city: 'Beirut', region: 'Beyrouth', country: 'Lebanon' }] });
  assert.equal(await h.module.describePoint(BEIRUT), 'Beirut, Lebanon');
});

test('the coarsened point is what reaches the geocoder, not the exact fix', async () => {
  const h = harness({ osResults: [{ city: 'Beirut', country: 'Lebanon' }] });
  await h.module.describePoint(BEIRUT);
  // 3 decimals -- about 110 m. A city name does not need more, and the exact
  // position never leaves the device.
  // JSON round-trip: the object was built inside the vm realm, so a direct
  // deepEqual compares prototypes across realms and fails on identity alone.
  assert.deepEqual(JSON.parse(JSON.stringify(h.sent.os[0])), { latitude: 33.894, longitude: 35.502 });
});

test('a missing city falls back through district, subregion, then region', async () => {
  const district = harness({ osResults: [{ district: 'Achrafieh', country: 'Lebanon' }] });
  assert.equal(await district.module.describePoint(BEIRUT), 'Achrafieh, Lebanon');

  const subregion = harness({ osResults: [{ subregion: 'Baabda', country: 'Lebanon' }] });
  assert.equal(await subregion.module.describePoint(BEIRUT), 'Baabda, Lebanon');

  const region = harness({ osResults: [{ region: 'Mount Lebanon', country: 'Lebanon' }] });
  assert.equal(await region.module.describePoint(BEIRUT), 'Mount Lebanon, Lebanon');
});

test('a country alone is still better than a blank field', async () => {
  const h = harness({ osResults: [{ country: 'Lebanon' }] });
  assert.equal(await h.module.describePoint(BEIRUT), 'Lebanon');
});

test('empty and whitespace fields do not become a stray comma', async () => {
  const h = harness({ osResults: [{ city: '   ', region: '', country: 'Lebanon' }] });
  assert.equal(await h.module.describePoint(BEIRUT), 'Lebanon');

  const nothing = harness({ osResults: [{ city: '', country: '  ' }] });
  assert.equal(await nothing.module.describePoint(BEIRUT), null);
});

test('no OS geocoder falls back to the web service', async () => {
  const h = harness({ web: { city: 'Beirut', principalSubdivision: 'Beyrouth', countryName: 'Lebanon' } });
  assert.equal(await h.module.describePoint(BEIRUT), 'Beirut, Lebanon');
  assert.equal(h.sent.os.length, 0, 'there is no OS geocoder to call');
  // Rounded here too -- the fallback is a third party, so it matters more.
  assert.match(h.sent.web[0], /latitude=33\.894&longitude=35\.502/);
});

test('the web service is not called when the OS already answered', async () => {
  const h = harness({ osResults: [{ city: 'Beirut', country: 'Lebanon' }], web: { city: 'Nowhere', countryName: 'Elsewhere' } });
  assert.equal(await h.module.describePoint(BEIRUT), 'Beirut, Lebanon');
  assert.equal(h.sent.web.length, 0, 'no third party should see the position');
});

test('an OS geocoder that answers with nothing still tries the fallback', async () => {
  const h = harness({ osResults: [], web: { locality: 'Beirut', countryName: 'Lebanon' } });
  assert.equal(await h.module.describePoint(BEIRUT), 'Beirut, Lebanon');
});

test('a thrown geocoder and a failed fallback give null, not an exception', async () => {
  const h = harness({ osThrows: true, web: null });
  assert.equal(await h.module.describePoint(BEIRUT), null);
});
