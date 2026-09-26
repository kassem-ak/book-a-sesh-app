// Run: node tests/community-create.test.cjs
// Starting a community sets everything, not just the name.
//
// The create form asked for a name and nothing else, so you made the community
// and then had to go and find the settings to say what sport it was about, who
// could join and what it was for. The RPC was the reason: one argument, and a
// hard-coded empty description.
//
// What is pinned here is the wire call -- that every field the form collects
// actually leaves the client. A field that renders but is never sent is the
// same bug in a costume.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const SPORT = '11111111-1111-4111-8111-111111111111';

function harness() {
  const calls = [];
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      calls.push({ path: new URL(url).pathname, body: init?.body ? JSON.parse(init.body) : null });
      return new Response(JSON.stringify([{ id: 'c1', slug: 'the-crew', name: 'The Crew' }]), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    } },
  });
  const dependencies = {
    './availability': { cleanNote: (v) => v, noteKey: () => '', SlotNotes: {} },
    './bookings': { currentAppUserId: async () => 'me' },
    './schema': { markScheduleNotesSchemaMissing: () => {}, scheduleNotesSchemaReady: () => true },
    './session': { ensureAppSession: async () => {} },
    './supabase': { supabase },
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

const rpcBody = (calls) =>
  calls.find((call) => call.path.endsWith('/create_community_with_owner'))?.body;

test('every field the form collects reaches the server', async () => {
  const h = harness();
  await h.module.createCommunity({
    name: 'The Crew',
    about: 'Deep water, long breaths.',
    privacy: 'closed',
    sportId: SPORT,
    chatMode: 'newsletter',
    socials: {
      instagram: 'thecrew', facebook: 'the.crew', tiktok: 'crewtok',
      website: 'https://thecrew.example',
    },
  });
  assert.deepEqual(rpcBody(h.calls), {
    p_name: 'The Crew',
    p_about: 'Deep water, long breaths.',
    p_privacy: 'closed',
    p_sport_id: SPORT,
    p_chat_mode: 'newsletter',
    p_instagram: 'thecrew',
    p_facebook: 'the.crew',
    p_tiktok: 'crewtok',
    p_website: 'https://thecrew.example',
  });
});

// A name on its own still has to work: the form allows it, and every argument
// on the server defaults. What must not happen is an argument going missing
// entirely, which PostgREST would resolve against a different overload.
test('a name on its own sends the defaults, not gaps', async () => {
  const h = harness();
  await h.module.createCommunity({ name: 'Just A Name' });
  assert.deepEqual(rpcBody(h.calls), {
    p_name: 'Just A Name',
    p_about: '',
    p_privacy: 'open',
    p_sport_id: null,
    p_chat_mode: 'chatroom',
    p_instagram: null,
    p_facebook: null,
    p_tiktok: null,
    p_website: null,
  });
});

// No sport chosen is a real answer, not a missing one -- the column is nullable
// on purpose. It must arrive as null rather than being dropped from the call.
test('no sport chosen is sent as null', async () => {
  const h = harness();
  await h.module.createCommunity({ name: 'Crew', sportId: null, about: 'x' });
  const body = rpcBody(h.calls);
  assert.ok('p_sport_id' in body, 'the argument must be present');
  assert.equal(body.p_sport_id, null);
});
