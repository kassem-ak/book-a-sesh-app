// Run: node tests/profile-save.test.cjs
// saveMyProfile used an upsert. ON CONFLICT DO UPDATE assigns every column in
// the payload, including user_id -- and `authenticated` deliberately has no
// UPDATE privilege on user_id, because that is what stops a profile row being
// re-keyed onto another account. Postgres refused the whole statement with
// 42501, so nobody with an existing profile could save an edit.
//
// These assert the WIRE SHAPE, because that is where the bug lived: the intent
// was right and the statement Postgres received was not.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const APP_ID = '00000000-0000-4000-8000-000000000001';
const SPORTS = [{ id: 'sport-1', name: 'Boxing', kind: 'sport' }, { id: 'sport-2', name: 'Yoga', kind: 'sport' }];

function harness({ profileRowExists = true } = {}) {
  const calls = [];
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      const target = new URL(url);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(init.body) : null;
      calls.push({ method, path: target.pathname, body, prefer: init?.headers?.Prefer ?? init?.headers?.prefer ?? '' });
      let payload = [];
      if (target.pathname.endsWith('/rpc/current_app_user')) payload = APP_ID;
      else if (target.pathname.endsWith('/rpc/my_location_shared')) payload = false;
      else if (target.pathname.endsWith('/sports')) payload = SPORTS;
      else if (target.pathname.endsWith('/users')) payload = [{ id: APP_ID }];
      else if (/partner_profiles|coach_profiles/.test(target.pathname)) {
        payload = method === 'PATCH' && profileRowExists ? [{ user_id: APP_ID }] : [];
      }
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  supabase.auth.getUser = async () => ({
    data: { user: { id: 'auth-1', email: 'a@example.com', is_anonymous: false, user_metadata: {} } },
    error: null,
  });
  const dependencies = {
    './supabase': { supabase },
    './bookings': { currentAppUserId: async () => APP_ID },
    './geo': { coarsenPoint: (point) => point },
    './signup': { readSignupDraft: async () => null, saveSignupDraft: async () => {}, clearSignupDraft: async () => {} },
  };
  const filename = join(__dirname, '../src/lib/profiles.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (id) => dependencies[id] }, { filename });
  return { save: exports.saveMyProfile, calls };
}

const PROFILE = {
  id: APP_ID, name: 'Kassem', avatarUrl: null, role: 'member',
  bio: 'hello', headline: '', level: '', sportIds: ['sport-1'],
  city: 'Beirut', sharesLocation: false,
};

const profileWrites = (calls) => calls.filter((c) => /partner_profiles|coach_profiles/.test(c.path));

test('an existing profile is saved with UPDATE, never an upsert', async () => {
  const h = harness({ profileRowExists: true });
  await h.save(PROFILE);
  const writes = profileWrites(h.calls);
  assert.ok(writes.some((c) => c.method === 'PATCH'), 'expected a PATCH');
  assert.equal(writes.filter((c) => c.method === 'POST').length, 0, 'must not INSERT when the row exists');
  for (const call of writes) {
    assert.ok(!/merge-duplicates/.test(call.prefer), 'merge-duplicates means ON CONFLICT DO UPDATE, which is what 42501d');
  }
});

test('the UPDATE body never carries user_id', async () => {
  const h = harness({ profileRowExists: true });
  await h.save(PROFILE);
  for (const call of profileWrites(h.calls).filter((c) => c.method === 'PATCH')) {
    assert.ok(!('user_id' in call.body), `user_id must not appear in an UPDATE: ${JSON.stringify(call.body)}`);
  }
});

test('a missing profile row falls back to INSERT, which may carry user_id', async () => {
  const h = harness({ profileRowExists: false });
  await h.save(PROFILE);
  const inserts = profileWrites(h.calls).filter((c) => c.method === 'POST');
  assert.equal(inserts.length, 1, 'expected exactly one INSERT');
  const row = Array.isArray(inserts[0].body) ? inserts[0].body[0] : inserts[0].body;
  assert.equal(row.user_id, APP_ID, 'user_id IS allowed on insert');
});

test('a coach profile save touches only the bio -- not what they sell', async () => {
  const coach = harness({ profileRowExists: true });
  await coach.save({ ...PROFILE, role: 'coach', headline: 'Boxing coach', level: 'Pro' });
  const body = profileWrites(coach.calls).find((c) => c.method === 'PATCH').body;
  assert.equal(body.bio, PROFILE.bio.trim());
  // Headline, level and specialties belong to Coaching sessions and are written
  // there. Two screens owning one value means whichever saved last wins, and
  // editing your bio would quietly revert your coaching subject.
  assert.ok(!('headline' in body), 'headline belongs to Coaching sessions');
  assert.ok(!('level' in body), 'level belongs to Coaching sessions');
  // sport_id is derived by sync_coach_primary_sport from coach_sports; sending
  // it here would be a second writer for one value.
  assert.ok(!('sport_id' in body), 'the primary specialty is derived server-side');
});

test('a member still stores their primary interest as sport_id', async () => {
  const member = harness({ profileRowExists: true });
  await member.save(PROFILE);
  const body = profileWrites(member.calls).find((c) => c.method === 'PATCH').body;
  // Members have no coach_sports row and no trigger, so partner_profiles keeps
  // carrying the first interest itself.
  assert.ok('sport_id' in body);
  assert.ok(!('headline' in body), 'partner_profiles has no headline column');
});

test('the display name still reaches users', async () => {
  const h = harness({ profileRowExists: true });
  await h.save({ ...PROFILE, name: '  Kassem  ' });
  const users = h.calls.find((c) => c.path.endsWith('/users') && c.method === 'PATCH');
  assert.equal(users.body.name, 'Kassem', 'trimmed');
});

test('the area is saved, trimmed, alongside the name', async () => {
  const h = harness({ profileRowExists: true });
  await h.save({ ...PROFILE, city: '  Beirut  ' });
  const users = h.calls.find((c) => c.path.endsWith('/users') && c.method === 'PATCH');
  assert.equal(users.body.city, 'Beirut');
});

test('an emptied area is stored as null, not an empty string', async () => {
  const h = harness({ profileRowExists: true });
  await h.save({ ...PROFILE, city: '   ' });
  const users = h.calls.find((c) => c.path.endsWith('/users') && c.method === 'PATCH');
  assert.equal(users.body.city, null, 'unknown must have one representation');
});

test('saving never writes location -- sharing is its own explicit action', async () => {
  const h = harness({ profileRowExists: true });
  await h.save({ ...PROFILE, sharesLocation: true });
  for (const call of h.calls.filter((c) => c.path.endsWith('/users') && c.method === 'PATCH')) {
    assert.ok(!('location' in call.body), 'Save must not silently capture a position');
  }
});
