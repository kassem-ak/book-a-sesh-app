// Run: node tests/booking-options.test.cjs
// What you can buy on the booking screen. A coach who defined any package used
// to lose the single session entirely -- the packages replaced the fallback
// instead of joining it, so the only way to train with them once was to buy ten.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = join(__dirname, '../src/state/models.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const stubs = {};
  runInNewContext(code, {
    exports,
    require: (id) => {
      if (id in stubs) return stubs[id];
      // models.ts pulls in type-only and small helper modules; anything it
      // actually reaches for at load time is returned as an inert object.
      return new Proxy({}, { get: () => () => undefined });
    },
    Array, Object, JSON, Number, Math, String, Date, Map, Set,
  }, { filename });
  return exports;
}

const coach = (price, packages) => ({ id: 'c1', name: 'Dana', price, packages });

test('a coach with packages still offers a single session', () => {
  const { coachPackageOptions } = load();
  const options = coachPackageOptions(coach(45, [
    { id: 'p10', sessions: 10, price: 400 },
    { id: 'p5', sessions: 5, price: 210 },
  ]));
  // This is the bug: before, this list was the two packs and nothing else.
  assert.equal(options.length, 3);
  assert.equal(options[0].name, 'Single session');
  assert.equal(options[0].price, 45);
  assert.equal(options[0].packageId, null);
  // Single first, then packs smallest to largest.
  assert.equal(options.map((o) => o.sessions).join(','), '1,5,10');
});

test('a coach with no packages still gets the single session', () => {
  const { coachPackageOptions } = load();
  const options = coachPackageOptions(coach(45, []));
  assert.equal(options.length, 1);
  assert.equal(options[0].name, 'Single session');
  assert.equal(options[0].price, 45);
});

test('a coach who sells a one-session pack does not get two of them', () => {
  const { coachPackageOptions } = load();
  const options = coachPackageOptions(coach(45, [
    { id: 'p1', sessions: 1, price: 40 },
    { id: 'p10', sessions: 10, price: 400 },
  ]));
  assert.equal(options.filter((o) => o.sessions === 1).length, 1);
  // Theirs wins: it is a real row with a real id, and the price they chose.
  assert.equal(options[0].packageId, 'p1');
  assert.equal(options[0].price, 40);
});

test('no rate set and packages present does not quote a $0 session', () => {
  const { coachPackageOptions } = load();
  const options = coachPackageOptions(coach(0, [{ id: 'p10', sessions: 10, price: 400 }]));
  // A 0 here is "no price on file", not "free". Offering it would quote a
  // price nobody chose.
  assert.equal(options.length, 1);
  assert.equal(options[0].sessions, 10);
});

test('no rate and no packages keeps the long-standing fallback', () => {
  const { coachPackageOptions } = load();
  const options = coachPackageOptions(coach(0, []));
  // The booking screen says "no price on file" rather than printing $0, so
  // there is still something to select.
  assert.equal(options.length, 1);
  assert.equal(options[0].name, 'Single session');
  assert.equal(options[0].price, 0);
});

test('packages missing an id are ignored rather than shown unbookable', () => {
  const { coachPackageOptions } = load();
  const options = coachPackageOptions(coach(45, [
    { id: '', sessions: 5, price: 210 },
    { id: 'p10', sessions: 10, price: 400 },
  ]));
  assert.equal(options.map((o) => o.sessions).join(','), '1,10');
});

test('a coach with no packages field at all does not throw', () => {
  const { coachPackageOptions } = load();
  const options = coachPackageOptions({ id: 'c1', name: 'Dana', price: 45 });
  assert.equal(options.length, 1);
  assert.equal(options[0].sessions, 1);
});
