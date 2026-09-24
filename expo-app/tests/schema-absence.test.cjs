// Run: node --test tests/schema-absence.test.cjs
//
// What an absent table/column/function actually looks like coming back from
// PostgREST. Every code below was observed against the live database, not
// guessed -- the obvious guess for a missing table (42P01) is WRONG, because
// PostgREST resolves the relation against its own schema cache and refuses
// before Postgres is ever asked. Getting it wrong means the degradation path
// never runs and the read throws on every load instead of going quiet once.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = join(__dirname, '../src/lib/schema.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: () => ({}) }, { filename });
  return exports;
}

test('a missing table is PGRST205, which is what PostgREST actually sends', () => {
  const { isMissingTable } = load();
  // Verbatim from the live database for public.session_feedback and
  // public.community_join_requests.
  assert.equal(isMissingTable({ code: 'PGRST205' }), true);
  // Still accepted: a direct SQL path produces the Postgres code.
  assert.equal(isMissingTable({ code: '42P01' }), true);
  assert.equal(isMissingTable({ code: '42703' }), false);
  assert.equal(isMissingTable(null), false);
});

test('a missing column is 42703', () => {
  const { isMissingColumn } = load();
  // Verbatim: "column communities.privacy does not exist".
  assert.equal(isMissingColumn({ code: '42703' }), true);
  assert.equal(isMissingColumn({ code: 'PGRST205' }), false);
  assert.equal(isMissingColumn(undefined), false);
});

test('a missing function is PGRST202 from the cache, 42883 from Postgres', () => {
  const { isMissingFunction } = load();
  // Verbatim for public.request_community_membership.
  assert.equal(isMissingFunction({ code: 'PGRST202' }), true);
  assert.equal(isMissingFunction({ code: '42883' }), true);
  assert.equal(isMissingFunction({ code: '42703' }), false);
});

test('the three do not overlap', () => {
  const { isMissingColumn, isMissingTable, isMissingFunction } = load();
  for (const code of ['42703', '42P01', 'PGRST205', 'PGRST202', '42883']) {
    const hits = [isMissingColumn, isMissingTable, isMissingFunction]
      .filter((check) => check({ code })).length;
    assert.equal(hits, 1, `${code} should match exactly one check`);
  }
});
