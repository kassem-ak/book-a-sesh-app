// Run: node tests/pricing.test.cjs
// Money. The database enforces who may write these rows and the ranges they
// must fall in; those are verified against the live schema. What is left here
// is the part that turns what a coach typed into cents -- where a factor of a
// hundred, a rounding error, or a silent 0 is a real price someone pays.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const ME = '00000000-0000-4000-8000-0000000000aa';

function harness(responses = {}) {
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
      const key = Object.keys(responses).find((k) => target.pathname.endsWith(k));
      const payload = key ? responses[key] : [];
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  const dependencies = {
    './supabase': { supabase },
    './bookings': { currentAppUserId: async () => ME },
  };
  const filename = join(__dirname, '../src/lib/pricing.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (id) => {
    assert.ok(id in dependencies, `Unexpected import: ${id}`);
    return dependencies[id];
  }, URL, Response, Headers, Promise, Array, Object, JSON, Number, Math, String }, { filename });
  return { module: exports, calls };
}

// ---- parsing ---------------------------------------------------------------

test('a typed price becomes cents, however it was typed', () => {
  const { module: m } = harness();
  assert.equal(m.parseMoney('45'), 4500);
  assert.equal(m.parseMoney('45.5'), 4550);
  assert.equal(m.parseMoney('45.50'), 4550);
  assert.equal(m.parseMoney('$45.50'), 4550);
  assert.equal(m.parseMoney(' 45 '), 4500);
  assert.equal(m.parseMoney('0'), 0);
});

test('binary floating point does not shave a cent off', () => {
  const { module: m } = harness();
  // 19.99 * 100 is 1998.9999999999998 in IEEE 754. Truncating gives 1998.
  assert.equal(m.parseMoney('19.99'), 1999);
  assert.equal(m.parseMoney('1.10'), 110);
  assert.equal(m.parseMoney('8.20'), 820);
});

test('nonsense returns null rather than a silent zero', () => {
  const { module: m } = harness();
  // A stored 0 means "no rate set", so a failed parse must never become one.
  assert.equal(m.parseMoney(''), null);
  assert.equal(m.parseMoney('abc'), null);
  assert.equal(m.parseMoney('4.5.6'), null);
  // Rejected on the raw input: stripping the minus first would turn this into
  // a perfectly valid $20.
  assert.equal(m.parseMoney('-20'), null);
});

test('cents come back as the string that goes in the field', () => {
  const { module: m } = harness();
  assert.equal(m.money(4500), '45');
  assert.equal(m.money(4550), '45.50');
  assert.equal(m.money(1999), '19.99');
  assert.equal(m.money(0), '0');
});

// ---- writes ----------------------------------------------------------------

test('the rate is written as cents, against this coach only', async () => {
  const h = harness();
  await h.module.setSessionRate(4500);
  const write = h.calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/coach_profiles'));
  assert.ok(write, 'expected an update');
  assert.equal(write.body.price_cents, 4500);
  assert.match(write.query, /user_id=eq\.00000000-0000-4000-8000-0000000000aa/);
});

test('a negative rate is refused before it reaches the server', async () => {
  const h = harness();
  await assert.rejects(() => h.module.setSessionRate(-1), /0 or more/);
  assert.equal(h.calls.length, 0, 'nothing should be sent');
});

test('a one-session package is refused — that is the rate, not a package', async () => {
  const h = harness();
  // Two prices for the same thing is two prices that can disagree.
  await assert.rejects(() => h.module.savePackage({ sessions: 1, priceCents: 4500 }), /two or more/);
  await assert.rejects(() => h.module.savePackage({ sessions: 0, priceCents: 4500 }), /two or more/);
  assert.equal(h.calls.length, 0);
});

test('a package is inserted under this coach and defaults to active', async () => {
  const h = harness();
  await h.module.savePackage({ sessions: 10, priceCents: 40000 });
  const write = h.calls.find((c) => c.method === 'POST' && c.path.endsWith('/packages'));
  assert.ok(write, 'expected an insert');
  const row = Array.isArray(write.body) ? write.body[0] : write.body;
  assert.deepEqual(JSON.parse(JSON.stringify(row)), {
    coach_id: ME, sessions: 10, price_cents: 40000, active: true,
  });
});

test('a package with an id updates instead of adding a second one', async () => {
  const h = harness();
  await h.module.savePackage({ id: 'pkg-1', sessions: 10, priceCents: 39900 });
  assert.equal(h.calls.filter((c) => c.method === 'POST').length, 0);
  const write = h.calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/packages'));
  assert.ok(write, 'expected an update');
  assert.match(write.query, /id=eq\.pkg-1/);
});

test('promo codes are normalised so both sides mean the same code', async () => {
  const h = harness();
  await h.module.addPromo(' summer 20 ', 20);
  const write = h.calls.find((c) => c.method === 'POST' && c.path.endsWith('/coach_promos'));
  const row = Array.isArray(write.body) ? write.body[0] : write.body;
  assert.equal(row.code, 'SUMMER20');
  assert.equal(row.pct, 20);
  assert.equal(row.coach_id, ME);
});

test('a discount outside 1-100 is refused, matching the database check', async () => {
  const h = harness();
  await assert.rejects(() => h.module.addPromo('SUMMER20', 0), /between 1% and 100%/);
  await assert.rejects(() => h.module.addPromo('SUMMER20', 101), /between 1% and 100%/);
  await assert.rejects(() => h.module.addPromo('SUMMER20', 12.5), /between 1% and 100%/);
  assert.equal(h.calls.length, 0);
});

test('a code needs enough characters to be a code', async () => {
  const h = harness();
  await assert.rejects(() => h.module.addPromo('AB', 20), /three characters/);
  assert.equal(h.calls.length, 0);
});

// ---- reading ---------------------------------------------------------------

test('per-session price is worked out so the coach does not have to', async () => {
  const h = harness({
    '/coach_profiles': { price_cents: 4500 },
    '/packages': [{ id: 'p1', sessions: 10, price_cents: 40000, active: true }],
    '/coach_promos': [{ id: 'r1', code: 'SUMMER20', pct: 20, active: false }],
  });
  const pricing = await h.module.fetchMyPricing();
  assert.equal(pricing.rateCents, 4500);
  assert.equal(pricing.packages[0].perSessionCents, 4000);
  // The reason to buy a block is that it is cheaper per session; the coach
  // should see that while setting the price.
  assert.ok(pricing.packages[0].perSessionCents < pricing.rateCents);
  assert.equal(pricing.promos[0].active, false);
});

test('a coach who has set nothing reads as 0, not as an error', async () => {
  const h = harness({ '/coach_profiles': null });
  const pricing = await h.module.fetchMyPricing();
  assert.equal(pricing.rateCents, 0);
  assert.equal(pricing.packages.length, 0);
  assert.equal(pricing.promos.length, 0);
});
