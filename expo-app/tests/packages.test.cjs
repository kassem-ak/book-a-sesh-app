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

// ---- asking to cancel a package -------------------------------------------
//
// The money never moves through the app, so this is a request to a person and
// a record of their answer. The server owns who may decide and what an approval
// must carry; these pin the wire shape and the arithmetic the coach is shown.

test('the request carries only what the client is allowed to set', async () => {
  const h = harness();
  await h.module.requestCancellation(COACH, PACK, '  Moving away  ');
  const write = h.calls.find((c) => c.method === 'POST' && c.path.endsWith('/package_cancellations'));
  const sent = Array.isArray(write.body) ? write.body[0] : write.body;
  assert.equal(sent.client_id, ME);
  assert.equal(sent.coach_id, COACH);
  assert.equal(sent.package_id, PACK);
  assert.equal(sent.reason, 'Moving away');
  // status and refund are left to their defaults. Sending them would be the
  // client writing the coach's answer, and the insert policy refuses it.
  assert.ok(!('status' in sent));
  assert.ok(!('refund_cents' in sent));
  assert.ok(!('decided_by' in sent));
});

test('an empty reason is stored as nothing, not an empty string', async () => {
  const h = harness();
  await h.module.requestCancellation(COACH, PACK, '   ');
  const write = h.calls.find((c) => c.method === 'POST' && c.path.endsWith('/package_cancellations'));
  const sent = Array.isArray(write.body) ? write.body[0] : write.body;
  assert.equal(sent.reason, null);
});

test('approving without an amount is refused before it reaches the server', async () => {
  const h = harness();
  // "Nothing back" is a decision; "I did not say" is half an answer that leaves
  // the client knowing the pack is gone and not what they are getting.
  await assert.rejects(() => h.module.decideCancellation('req-1', 'approved'), /how much/i);
  assert.equal(h.calls.filter((c) => c.method === 'POST').length, 0);
});

test('approving with nothing back is a real answer', async () => {
  const h = harness();
  await h.module.decideCancellation('req-1', 'approved', 0);
  const rpc = h.calls.find((c) => c.path.endsWith('/rpc/decide_package_cancellation'));
  assert.equal(rpc.body.p_status, 'approved');
  assert.equal(rpc.body.p_refund_cents, 0);
});

test('a negative refund is clamped rather than sent', async () => {
  const h = harness();
  await h.module.decideCancellation('req-1', 'approved', -500);
  const rpc = h.calls.find((c) => c.path.endsWith('/rpc/decide_package_cancellation'));
  assert.equal(rpc.body.p_refund_cents, 0);
});

test('declining carries no amount at all', async () => {
  const h = harness();
  await h.module.decideCancellation('req-1', 'rejected');
  const rpc = h.calls.find((c) => c.path.endsWith('/rpc/decide_package_cancellation'));
  assert.equal(rpc.body.p_status, 'rejected');
  assert.equal(rpc.body.p_refund_cents, null);
});

test('taking a request back is one update, not a delete', async () => {
  const h = harness();
  await h.module.withdrawCancellation('req-1');
  const write = h.calls.find((c) => c.method === 'PATCH');
  assert.ok(write, 'expected an update');
  assert.equal(write.body.status, 'withdrawn');
  // Deleting it would lose the fact that it was ever asked.
  assert.equal(h.calls.filter((c) => c.method === 'DELETE').length, 0);
});

test('the suggested refund is the unused share of what was paid', () => {
  const { suggestedRefundCents } = harness().module;
  // Six of ten left on a $400 pack.
  assert.equal(suggestedRefundCents({ total: 10, remaining: 6 }, 40000), 24000);
  assert.equal(suggestedRefundCents({ total: 5, remaining: 0 }, 20000), 0);
  assert.equal(suggestedRefundCents({ total: 5, remaining: 5 }, 20000), 20000);
});

test('an odd split rounds to a whole cent rather than a fraction', () => {
  const { suggestedRefundCents } = harness().module;
  // Two of three left on $100: 66.666...
  assert.equal(suggestedRefundCents({ total: 3, remaining: 2 }, 10000), 6667);
});

test('a pack with no sessions suggests nothing instead of dividing by zero', () => {
  const { suggestedRefundCents } = harness().module;
  assert.equal(suggestedRefundCents({ total: 0, remaining: 0 }, 10000), 0);
});
