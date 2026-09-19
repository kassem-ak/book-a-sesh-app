// Run: node tests/coach-teaching.test.cjs
// What a coach teaches, now that it is a different list from what they do.
//
// The database owns who may write these rows and keeps coach_profiles.sport_id
// in step with the first one; that is verified against the live schema. What is
// left here is the diff the client sends -- where a wholesale delete would drop
// a coach out of Discover mid-save, and a missed reorder would leave them
// leading with the wrong subject.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const ME = '00000000-0000-4000-8000-0000000000aa';
const SWIM = '11111111-1111-4111-8111-111111111111';
const BOX = '22222222-2222-4222-8222-222222222222';
const CHESS = '33333333-3333-4333-8333-333333333333';

function harness({ existing = [], profile = { headline: 'Swim coach', level: 'Pro' } } = {}) {
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
      });
      if (target.pathname.endsWith('/coach_sports') && method === 'GET') {
        return new Response(JSON.stringify(existing), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (target.pathname.endsWith('/coach_profiles') && method === 'GET') {
        return new Response(JSON.stringify(profile), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  const dependencies = {
    './avatars': { pickAvatar: async () => null },
    './profiles': { realProfileIdentity: async () => ({ appId: ME, user: { id: 'auth' } }) },
    './supabase': { supabase },
  };
  const filename = join(__dirname, '../src/lib/coaching.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (id) => {
    assert.ok(id in dependencies, `Unexpected import: ${id}`);
    return dependencies[id];
  }, URL, Response, Headers, Promise, Array, Object, JSON, Number, String, Math }, { filename });
  return { module: exports, calls };
}

const rows = (calls, method) =>
  calls.filter((c) => c.path.endsWith('/coach_sports') && c.method === method);

test('specialties are read in the order the coach put them in', async () => {
  const h = harness({ existing: [{ sport_id: BOX, position: 0 }, { sport_id: SWIM, position: 1 }] });
  const basics = await h.module.fetchCoachBasics();
  assert.equal(basics.teachingIds.join(','), `${BOX},${SWIM}`);
  assert.equal(basics.headline, 'Swim coach');
  const read = rows(h.calls, 'GET')[0];
  assert.match(read.query, /order=position/);
  assert.match(read.query, /coach_id=eq\.00000000-0000-4000-8000-0000000000aa/);
});

test('position is written, because the order IS the meaning', async () => {
  const h = harness({ existing: [] });
  await h.module.saveCoachBasics({ headline: 'H', level: 'L', teachingIds: [SWIM, BOX] });
  const write = rows(h.calls, 'POST')[0];
  assert.ok(write, 'expected an upsert');
  assert.equal(JSON.stringify(write.body), JSON.stringify([
    { coach_id: ME, sport_id: SWIM, position: 0 },
    { coach_id: ME, sport_id: BOX, position: 1 },
  ]));
});

test('a reorder with no additions is still written', async () => {
  // Same two subjects, swapped. Nothing is added or removed, but the coach has
  // changed which one they lead with -- and that is what Discover shows.
  const h = harness({ existing: [{ sport_id: SWIM }, { sport_id: BOX }] });
  await h.module.saveCoachBasics({ headline: 'H', level: 'L', teachingIds: [BOX, SWIM] });
  const write = rows(h.calls, 'POST')[0];
  assert.ok(write, 'a reorder must still reach the server');
  assert.equal(write.body[0].sport_id, BOX);
  assert.equal(write.body[0].position, 0);
});

test('removals are a diff, not a wipe', async () => {
  const h = harness({ existing: [{ sport_id: SWIM }, { sport_id: BOX }, { sport_id: CHESS }] });
  await h.module.saveCoachBasics({ headline: 'H', level: 'L', teachingIds: [SWIM] });
  const del = rows(h.calls, 'DELETE')[0];
  assert.ok(del, 'expected a delete');
  // Only the two dropped ones. Deleting everything first would briefly leave
  // the coach teaching nothing, and the trigger would null their primary sport
  // and drop them out of Discover mid-save.
  assert.match(del.query, /sport_id=in\./);
  assert.ok(del.query.includes(BOX) && del.query.includes(CHESS));
  assert.ok(!del.query.includes(SWIM), 'the kept subject must not be deleted');
});

test('nothing is deleted when nothing was dropped', async () => {
  const h = harness({ existing: [{ sport_id: SWIM }] });
  await h.module.saveCoachBasics({ headline: 'H', level: 'L', teachingIds: [SWIM, BOX] });
  assert.equal(rows(h.calls, 'DELETE').length, 0);
});

test('clearing every specialty deletes them and writes no empty upsert', async () => {
  const h = harness({ existing: [{ sport_id: SWIM }, { sport_id: BOX }] });
  await h.module.saveCoachBasics({ headline: 'H', level: 'L', teachingIds: [] });
  assert.equal(rows(h.calls, 'DELETE').length, 1);
  assert.equal(rows(h.calls, 'POST').length, 0, 'an empty upsert is a pointless round trip');
});

test('headline and level are trimmed, and sport_id is never sent', async () => {
  const h = harness({ existing: [] });
  await h.module.saveCoachBasics({ headline: '  Strength coach  ', level: '  Level 3  ', teachingIds: [SWIM] });
  const patch = h.calls.find((c) => c.path.endsWith('/coach_profiles') && c.method === 'PATCH');
  assert.equal(patch.body.headline, 'Strength coach');
  assert.equal(patch.body.level, 'Level 3');
  // sync_coach_primary_sport derives it from position 0. A second writer here
  // could disagree with the trigger, and the last one to run would win.
  assert.ok(!('sport_id' in patch.body), 'the primary specialty is derived server-side');
});
