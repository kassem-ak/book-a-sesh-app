// Run: node tests/person-by-id.test.cjs
// Opening a profile by id, for somebody Discover never loaded.
//
// The people list in the store is a browsing list: sorted and filtered for
// Discover, empty until a Discover tab has been opened, and missing you on
// purpose. Every other way into a profile -- a community member, your own
// Profile card -- hands over an id and nothing else, and used to land on "no
// longer available" for people who plainly exist.
//
// What is checked here is the order of the three shapes and, above all, that
// the third one exists: most accounts have filled in neither a coach nor a
// partner profile, and they still have a name and a face.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const THEM = '00000000-0000-4000-8000-0000000000bb';

function harness({ coach = null, partner = null, account = null, packages = [] } = {}) {
  const calls = [];
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      const target = new URL(url);
      calls.push(target.pathname);
      const json = (value) => new Response(JSON.stringify(value), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
      // maybeSingle asks for one row or none; the array shape is what
      // PostgREST returns and the client unwraps.
      if (target.pathname.endsWith('/coach_profiles')) return json(coach ?? []);
      if (target.pathname.endsWith('/partner_profiles')) return json(partner ?? []);
      if (target.pathname.endsWith('/packages')) return json(packages);
      if (target.pathname.endsWith('/users')) return json(account ?? []);
      return json([]);
    } },
  });
  const dependencies = {
    './availability': { cleanNote: (v) => v, noteKey: () => '', SlotNotes: {} },
    './bookings': { currentAppUserId: async () => THEM },
    './schema': { markScheduleNotesSchemaMissing: () => {}, scheduleNotesSchemaReady: () => true },
    './session': { ensureAppSession: async () => {} },
    './supabase': { supabase },
    // Screening is fire-and-forget and deliberately swallows everything, so
    // nothing under test depends on it.
    './gwin': { screenQuietly: () => {} },
    '../state/models': { CoachPkg: {}, Person: {} },
    './geo': { parseGeoPoint: () => undefined, GeoPoint: {} },
  };
  const filename = join(__dirname, '../src/lib/queries.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (id) => {
    assert.ok(id in dependencies, `Unexpected import: ${id}`);
    return dependencies[id];
  }, URL, Response, Headers, Promise, Array, Object, JSON, Number, String, Math, Set, Boolean, Date },
  { filename });
  return { module: exports, calls };
}

test('a coach comes back with their packages attached', async () => {
  const h = harness({
    coach: { user_id: THEM, headline: 'Swim coach', price_cents: 4500, rating_avg: 4.8, reviews_count: 3,
      user: { name: 'Rami', avatar_url: null, profile_tags: [] }, sport: { name: 'Swimming' }, coach_sports: [] },
    packages: [{ id: 'pkg-1', coach_id: THEM, sessions: 5, price_cents: 20000, active: true }],
  });
  const person = await h.module.fetchPerson(THEM);
  assert.equal(person.name, 'Rami');
  assert.equal(person.isCoach, true);
  assert.equal(person.price, 45);
  assert.deepEqual(person.packages.map((p) => p.sessions), [5]);
});

test('a training partner comes back as one, and asks for no packages', async () => {
  const h = harness({
    partner: { user_id: THEM, level: 'Intermediate', goal: 'Marathon', bio: 'Runs at dawn',
      looking_for: 'Running buddy', user: { name: 'Sara', avatar_url: null, profile_tags: [] }, sport: { name: 'Running' } },
  });
  const person = await h.module.fetchPerson(THEM);
  assert.equal(person.name, 'Sara');
  assert.equal(person.isCoach, false);
  assert.equal(person.sport, 'Running');
  assert.ok(!h.calls.some((path) => path.endsWith('/packages')), 'only coaches have packages');
});

// The one that matters. Neither profile filled in is the common case, not an
// error case, and returning null here is what put "no longer available" on
// your own Profile card.
test('an account with neither profile is still a person', async () => {
  const h = harness({ account: { id: THEM, name: 'Kassem', avatar_url: 'https://example.invalid/a.png', profile_tags: [{ tag: 'Diving' }] } });
  const person = await h.module.fetchPerson(THEM);
  assert.equal(person.name, 'Kassem');
  assert.equal(person.avatarUrl, 'https://example.invalid/a.png');
  assert.deepEqual(person.tags, ['Diving']);
  assert.equal(person.isCoach, false);
});

test('an id that is nobody is null, not a blank person', async () => {
  const h = harness();
  assert.equal(await h.module.fetchPerson(THEM), null);
});
