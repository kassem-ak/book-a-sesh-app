// Run: node --test tests/community-ref.test.cjs
// The store calls a community by its slug ("freedive"), not its uuid --
// fromRemoteCommunity maps `id: row.slug ?? row.id`. Sending a slug to
// .eq('id', ...) compares text against a uuid column, which Postgres answers
// with 22P02 rather than an empty result, and the whole settings screen died
// on it. These pin the column choice.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = join(__dirname, '../src/lib/communities.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: () => new Proxy({}, { get: () => () => null }),
    Array, Object, JSON, Number, String, Boolean, RegExp, Map, Set, Date, Promise,
  }, { filename });
  return exports;
}

test('a uuid is matched against id', () => {
  const { refColumn } = load();
  assert.equal(refColumn('c3e39a0e-f5f0-4877-aae4-459da64b6a0a'), 'id');
  assert.equal(refColumn('C3E39A0E-F5F0-4877-AAE4-459DA64B6A0A'), 'id');
});

test('a slug is matched against slug, never id', () => {
  const { refColumn } = load();
  // The exact value that took the screen down.
  assert.equal(refColumn('freedive'), 'slug');
  assert.equal(refColumn('test-com'), 'slug');
  assert.equal(refColumn('test-2'), 'slug');
});

test('a not-quite-uuid is treated as a slug rather than risking the cast', () => {
  const { refColumn } = load();
  // Too short, wrong groups, and a uuid with a trailing character: each of
  // these would raise 22P02 against a uuid column.
  assert.equal(refColumn('c3e39a0e-f5f0-4877-aae4'), 'slug');
  assert.equal(refColumn('c3e39a0e-f5f0-4877-aae4-459da64b6a0a-x'), 'slug');
  assert.equal(refColumn('not-a-uuid-at-all'), 'slug');
});
