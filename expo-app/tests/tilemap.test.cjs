// Run: node tests/tilemap.test.cjs
// Web Mercator arithmetic, which is the part of a map that goes wrong quietly:
// a projection that is subtly off still draws tiles and still places markers,
// just in the wrong place, and it looks plausible until someone checks a known
// coordinate. These pin it against published reference values.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = join(__dirname, '../src/components/TileMap.tsx');
  const source = readFileSync(filename, 'utf8');
  // Export the two module-private helpers for testing without loosening the
  // component's real surface.
  const code = ts.transpileModule(
    source + '\nexport const __test = { project, unproject, tileUrl };\n',
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } },
  ).outputText;
  const exports = {};
  const stub = new Proxy({}, { get: () => () => null });
  runInNewContext(code, { exports, Math, Number, String, Array, require: () => stub }, { filename });
  return exports;
}

const { __test, zoomToFit } = load();
const { project, unproject, tileUrl } = __test;
const TILE = 256;

// Null Island sits at the exact centre of the world square at every zoom.
test('0,0 projects to the centre of the world', () => {
  for (const zoom of [0, 5, 13]) {
    const scale = TILE * 2 ** zoom;
    const { x, y } = project({ latitude: 0, longitude: 0 }, zoom);
    assert.ok(Math.abs(x - scale / 2) < 1e-6, `x at zoom ${zoom}`);
    assert.ok(Math.abs(y - scale / 2) < 1e-6, `y at zoom ${zoom}`);
  }
});

test('the antimeridian and the prime meridian bound the world', () => {
  const zoom = 4;
  const scale = TILE * 2 ** zoom;
  assert.ok(Math.abs(project({ latitude: 0, longitude: -180 }, zoom).x) < 1e-6);
  assert.ok(Math.abs(project({ latitude: 0, longitude: 180 }, zoom).x - scale) < 1e-6);
});

// Checked against the standard slippy-map tilename formulae:
//   xtile = floor((lon + 180) / 360 * n)
//   ytile = floor((1 - asinh(tan(lat)) / PI) / 2 * n)
// London at zoom 10 is the useful one: it sits just west of the prime meridian,
// so tile 511 rather than 512 catches an off-by-one or a sign flip in x.
test('known cities land in the documented tiles', () => {
  const cases = [
    { name: 'Beirut', point: { latitude: 33.8938, longitude: 35.5018 }, zoom: 5, tile: [19, 12] },
    { name: 'London', point: { latitude: 51.5074, longitude: -0.1278 }, zoom: 10, tile: [511, 340] },
  ];
  for (const { name, point, zoom, tile } of cases) {
    const { x, y } = project(point, zoom);
    assert.deepEqual([Math.floor(x / TILE), Math.floor(y / TILE)], tile, name);
  }
});

test('project and unproject round trip', () => {
  for (const point of [
    { latitude: 33.8938, longitude: 35.5018 },
    { latitude: -33.8688, longitude: 151.2093 },
    { latitude: 64.1466, longitude: -21.9426 },
  ]) {
    const zoom = 14;
    const { x, y } = project(point, zoom);
    const back = unproject(x, y, zoom);
    assert.ok(Math.abs(back.latitude - point.latitude) < 1e-6, `lat ${point.latitude}`);
    assert.ok(Math.abs(back.longitude - point.longitude) < 1e-6, `lon ${point.longitude}`);
  }
});

test('latitude is clamped to the Mercator limit rather than diverging', () => {
  const zoom = 8;
  const scale = TILE * 2 ** zoom;
  for (const latitude of [90, -90, 89.9]) {
    const { y } = project({ latitude, longitude: 0 }, zoom);
    assert.ok(Number.isFinite(y), `y must stay finite at ${latitude}`);
    assert.ok(y >= -1 && y <= scale + 1, `y must stay on the world square at ${latitude}`);
  }
});

test('north is up: a higher latitude has a smaller y', () => {
  const zoom = 10;
  const north = project({ latitude: 40, longitude: 0 }, zoom).y;
  const south = project({ latitude: 30, longitude: 0 }, zoom).y;
  assert.ok(north < south, 'a map drawn upside down still looks like a map');
});

test('zooming in one level doubles the pixel distance between two points', () => {
  const a = { latitude: 33.8, longitude: 35.5 };
  const b = { latitude: 33.9, longitude: 35.6 };
  const gap = (zoom) => Math.hypot(project(b, zoom).x - project(a, zoom).x, project(b, zoom).y - project(a, zoom).y);
  assert.ok(Math.abs(gap(13) / gap(12) - 2) < 1e-9);
});

test('zoomToFit picks a zoom that actually fits, and is not fooled by one point', () => {
  const spread = [
    { latitude: 33.80, longitude: 35.45 },
    { latitude: 33.95, longitude: 35.60 },
  ];
  const zoom = zoomToFit(spread, 800, 600);
  const projected = spread.map((point) => project(point, zoom));
  assert.ok(Math.abs(projected[0].x - projected[1].x) <= 800, 'must fit horizontally');
  assert.ok(Math.abs(projected[0].y - projected[1].y) <= 600, 'must fit vertically');
  assert.equal(zoomToFit([spread[0]], 800, 600, 13), 13, 'a single point has no span, so keep the fallback');
  assert.equal(zoomToFit(spread, 0, 0, 11), 11, 'no layout yet, so keep the fallback');
});

test('tile urls follow the slippy-map scheme', () => {
  assert.equal(tileUrl(20, 13, 5), 'https://tile.openstreetmap.org/5/20/13.png');
});
