// Run: node tests/packages.test.cjs
// Packages with more than one session in them.
//
// The server owns the rules -- capacity, availability, all-or-nothing -- and
// those are verified against the live schema. What is left here is the wire
// shape of the multi-session call, and the arithmetic the two sides display.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const ME = '00000000-0000-4000-8000-0000000000aa';
const COACH = '00000000-0000-4000-8000-0000000000bb';
const PACK = '00000000-0000-4000-8000-0000000000cc';

function harness({ progress = [], names = [] } = {}) {
  const calls = [];
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      const target = new URL(url);
      calls.push({
        method: init?.method ?? 'GET',
        path: target.pathname,
        query: target.search,
        body: init?.body ? JSON.parse(init.body) : null,
      });
      if (target.pathname.endsWith('/package_progress')) {
        return new Response(JSON.stringify(progress), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (target.pathname.endsWith('/users')) {
        return new Response(JSON.stringify(names), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (target.pathname.endsWith('/rpc/book_package_sessions')) {
        const sent = init?.body ? JSON.parse(init.body) : {};
        return new Response(JSON.stringify(sent.p_slots.length), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  const dependencies = {
    './supabase': { supabase },
    './session': { currentAppUserId: async () => ME },
  };
  const filename = join(__dirname, '../src/lib/packages.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (id) => {
    assert.ok(id in dependencies, `Unexpected import: ${id}`);
    return dependencies[id];
  }, URL, Response, Headers, Promise, Array, Object, JSON, Number, String, Map, Set }, { filename });
  return { module: exports, calls };
}

const row = (over = {}) => ({
  package_id: PACK, client_id: ME, coach_id: COACH,
  total: 10, pending: 0, booked: 0, taken: 0, remaining: 10, ...over,
});

// ---- booking several at once ----------------------------------------------

test('every chosen session goes in one call, not one call each', async () => {
  const h = harness();
  const slots = [
    { at: '2026-10-05T17:30:00.000Z', label: '6:30 PM' },
    { at: '2026-10-12T17:30:00.000Z', label: '6:30 PM' },
    { at: '2026-10-19T17:30:00.000Z', label: '6:30 PM' },
  ];
  const booked = await h.module.bookPackageSessions(COACH, PACK, slots);
  assert.equal(booked, 3);
  const rpc = h.calls.filter((c) => c.path.endsWith('/rpc/book_package_sessions'));
  // A loop would leave somebody with two of three and no way to tell which
  // failed. One call is all of them or none.
  assert.equal(rpc.length, 1);
  assert.equal(rpc[0].body.p_slots.length, 3);
  assert.equal(rpc[0].body.p_coach, COACH);
  assert.equal(rpc[0].body.p_package_id, PACK);
});

test('each slot carries the coach-facing label, not display text', async () => {
  const h = harness();
  await h.module.bookPackageSessions(COACH, PACK, [{ at: '2026-10-05T17:30:00.000Z', label: '6:30 PM' }]);
  const sent = h.calls.find((c) => c.path.endsWith('/rpc/book_package_sessions')).body.p_slots[0];
  // The server checks this against coach_availability. Sending "5-session pack
  // - Oct 5 - 6:30 PM" would stop enforcing the day that format changed.
  assert.equal(JSON.stringify(sent), JSON.stringify({ at: '2026-10-05T17:30:00.000Z', label: '6:30 PM' }));
});

test('booking nothing is refused before it reaches the server', async () => {
  const h = harness();
  await assert.rejects(() => h.module.bookPackageSessions(COACH, PACK, []), /at least one/i);
  assert.equal(h.calls.filter((c) => c.method === 'POST').length, 0);
});

// ---- reading what is left --------------------------------------------------

test("a client reads their own packs, scoped to them", async () => {
  const h = harness({ progress: [row({ booked: 3, remaining: 7 })], names: [{ id: COACH, name: 'Dana Coach' }] });
  const packs = await h.module.fetchMyPackages();
  assert.equal(packs.length, 1);
  assert.equal(packs[0].booked, 3);
  assert.equal(packs[0].remaining, 7);
  assert.equal(packs[0].withName, 'Dana Coach');
  const read = h.calls.find((c) => c.path.endsWith('/package_progress'));
  assert.match(read.query, /client_id=eq\.00000000-0000-4000-8000-0000000000aa/);
});

test('a coach reads the same rows from the other side', async () => {
  const h = harness({ progress: [row({ client_id: 'someone', taken: 2, remaining: 8 })], names: [{ id: 'someone', name: 'Sam Client' }] });
  const packs = await h.module.fetchClientPackages();
  assert.equal(packs[0].taken, 2);
  assert.equal(packs[0].withName, 'Sam Client');
  const read = h.calls.find((c) => c.path.endsWith('/package_progress'));
  // Same view, filtered on the other column. Two separate calculations could
  // disagree; one view read twice cannot.
  assert.match(read.query, /coach_id=eq\.00000000-0000-4000-8000-0000000000aa/);
});

test('names are fetched once for everyone, not once each', async () => {
  const h = harness({
    progress: [row(), row({ package_id: 'pack-2' }), row({ package_id: 'pack-3' })],
    names: [{ id: COACH, name: 'Dana Coach' }],
  });
  await h.module.fetchMyPackages();
  assert.equal(h.calls.filter((c) => c.path.endsWith('/users')).length, 1);
});

test('a missing name falls back rather than rendering blank', async () => {
  const h = harness({ progress: [row()], names: [] });
  const packs = await h.module.fetchMyPackages();
  assert.equal(packs[0].withName, 'Coach');
  const asCoach = harness({ progress: [row()], names: [] });
  assert.equal((await asCoach.module.fetchClientPackages())[0].withName, 'Member');
});

test('no packs is an empty list and no name lookup at all', async () => {
  const h = harness({ progress: [] });
  assert.equal((await h.module.fetchMyPackages()).length, 0);
  assert.equal(h.calls.filter((c) => c.path.endsWith('/users')).length, 0);
});

// ---- the summary line ------------------------------------------------------

test('the summary names every state that is not zero', () => {
  const { progressSummary } = harness().module;
  assert.equal(
    progressSummary({ total: 10, booked: 3, pending: 1, taken: 2, remaining: 4 }),
    '3 booked · 1 waiting · 2 done · 4 left',
  );
});

test('zeroes are left out, because "0 waiting" invites a question', () => {
  const { progressSummary } = harness().module;
  assert.equal(progressSummary({ total: 10, booked: 0, pending: 0, taken: 0, remaining: 10 }), '10 left');
  assert.equal(progressSummary({ total: 5, booked: 2, pending: 0, taken: 0, remaining: 3 }), '2 booked · 3 left');
});

test('a finished pack still says so rather than going blank', () => {
  const { progressSummary } = harness().module;
  assert.equal(progressSummary({ total: 5, booked: 0, pending: 0, taken: 5, remaining: 0 }), '5 done · 0 left');
});
