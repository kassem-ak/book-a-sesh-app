// Run: node tests/social.test.cjs
// The wire shape of following. The database enforces the rules (no self-follow,
// no following across a block, only your own rows) and those are verified
// against the live schema; what can still go wrong here is the client sending
// the wrong pair of ids, or turning a double tap into an error.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const ME = '00000000-0000-4000-8000-0000000000aa';
const THEM = '00000000-0000-4000-8000-0000000000bb';

function harness(responses = {}) {
  const calls = [];
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      const target = new URL(url);
      const method = init?.method ?? 'GET';
      calls.push({
        method,
        path: target.pathname,
        query: target.search,
        body: init?.body ? JSON.parse(init.body) : null,
        // supabase-js may pass a Headers instance or a plain object, and the
        // casing differs between them. Normalise before reading.
        prefer: new Headers(init?.headers ?? {}).get('prefer') ?? '',
      });
      const key = Object.keys(responses).find((k) => target.pathname.endsWith(k));
      const payload = key ? responses[key] : [];
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  const dependencies = {
    './supabase': { supabase },
    './bookings': { currentAppUserId: async () => ME },
  };
  const filename = join(__dirname, '../src/lib/social.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (id) => {
    assert.ok(id in dependencies, `Unexpected import: ${id}`);
    return dependencies[id];
  }, URL, Response, Headers, Promise, Array, Map, Object, JSON }, { filename });
  return { module: exports, calls };
}

test('following writes the pair, and a double tap is not an error', async () => {
  const h = harness();
  await h.module.followPerson(THEM);
  const write = h.calls.find((c) => c.method === 'POST' && c.path.endsWith('/follows'));
  assert.ok(write, 'expected an insert');
  const row = Array.isArray(write.body) ? write.body[0] : write.body;
  assert.deepEqual(row, { follower_id: ME, subject_id: THEM });
  // ignoreDuplicates compiles to ON CONFLICT DO NOTHING, so following twice is
  // a no-op rather than a unique-violation the person has to read.
  assert.match(write.prefer, /ignore-duplicates/);
});

test('following yourself is refused before it reaches the server', async () => {
  const h = harness();
  await assert.rejects(() => h.module.followPerson(ME), /cannot follow yourself/i);
  assert.equal(h.calls.filter((c) => c.method === 'POST').length, 0, 'nothing should be sent');
});

test('unfollowing deletes only my own row, not every follow of that person', async () => {
  const h = harness();
  await h.module.unfollowPerson(THEM);
  const del = h.calls.find((c) => c.method === 'DELETE');
  assert.ok(del, 'expected a delete');
  // Both ids must be in the filter. Deleting on subject_id alone would remove
  // everyone else's follow of that person.
  assert.match(del.query, /follower_id=eq\.00000000-0000-4000-8000-0000000000aa/);
  assert.match(del.query, /subject_id=eq\.00000000-0000-4000-8000-0000000000bb/);
});

test('the circle is read for me, newest first', async () => {
  const h = harness({ '/follows': [] });
  await h.module.fetchCircle();
  const read = h.calls.find((c) => c.method === 'GET' && c.path.endsWith('/follows'));
  assert.match(read.query, /follower_id=eq\.00000000-0000-4000-8000-0000000000aa/);
  assert.match(read.query, /order=created_at\.desc/);
});

test('an empty circle does no follow-up reads', async () => {
  const h = harness({ '/follows': [] });
  // Length, not deepEqual: the module runs in a vm realm, so its arrays fail
  // deepStrictEqual against ours on prototype identity alone.
  assert.equal((await h.module.fetchCircle()).length, 0);
  assert.equal(h.calls.filter((c) => /coach_profiles|partner_profiles/.test(c.path)).length, 0);
});

test('a followed person with no profile row still renders, as a member', async () => {
  const h = harness({
    '/follows': [{ subject_id: THEM, created_at: '2026-09-19T00:00:00Z', subject: { id: THEM, name: 'Walid', avatar_url: null } }],
  });
  const circle = await h.module.fetchCircle();
  assert.equal(circle.length, 1);
  assert.equal(circle[0].name, 'Walid');
  assert.equal(circle[0].role, 'member');
  assert.equal(circle[0].sport, null);
});

test('a missing subject falls back to a label, never a raw id', async () => {
  const h = harness({
    '/follows': [{ subject_id: THEM, created_at: '2026-09-19T00:00:00Z', subject: null }],
  });
  const circle = await h.module.fetchCircle();
  assert.equal(circle[0].name, 'Member');
  assert.notEqual(circle[0].name, THEM);
});
