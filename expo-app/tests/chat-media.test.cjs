// Run: node --test tests/chat-media.test.cjs
// Pictures in chats.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const uploads = [];
  const signCalls = [];
  const removed = [];
  let counter = 0;
  const bucket = {
    upload: async (path, bytes, options) => { uploads.push({ path, options }); return { error: null }; },
    createSignedUrls: async (paths) => {
      signCalls.push(paths);
      // A fresh signature is a fresh URL, exactly like the real thing.
      return { data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}?t=${++counter}`, error: null })), error: null };
    },
    remove: async (paths) => { removed.push(...paths); return { error: null }; },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(join(__dirname, '../src/lib/chatMedia.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    exports,
    require: (id) => {
      if (id === './supabase') return { supabase: { storage: { from: () => bucket } } };
      if (id === './avatars') return {};
      throw new Error(`Unexpected import: ${id}`);
    },
    Date, Math, Map, Set, Promise,
  });
  return { lib: exports, uploads, signCalls, removed };
}

const PICKED = { uri: 'file://p.jpg', bytes: new ArrayBuffer(4), mimeType: 'image/jpeg' };

// The storage rules read the room from the path, and a check constraint ties a
// message's image to its own room. A different shape fails both.
test('a picture is stored under its own room', async () => {
  const { lib, uploads } = load();
  const dm = await lib.uploadChatImage({ kind: 'dm', id: 'conv-1' }, PICKED);
  const room = await lib.uploadChatImage({ kind: 'community', id: 'comm-9' }, { ...PICKED, mimeType: 'image/png' });
  assert.match(dm, /^dm\/conv-1\/\d+-[a-z0-9]+\.jpg$/);
  assert.match(room, /^community\/comm-9\/\d+-[a-z0-9]+\.png$/);
  assert.equal(uploads[0].options.upsert, false, 'never overwrites another picture');
});

// The flicker fix. The DM thread polls every ten seconds; re-signing each time
// is a new URL each time, and every picture reloads.
test('a signed link is reused, not re-signed, while it is still fresh', async () => {
  const { lib, signCalls } = load();
  const first = await lib.signChatImages(['dm/a/1.jpg', 'dm/a/2.jpg', null]);
  const second = await lib.signChatImages(['dm/a/1.jpg', 'dm/a/2.jpg']);
  assert.equal(signCalls.length, 1, 'the second poll must not ask storage again');
  assert.equal(second.get('dm/a/1.jpg'), first.get('dm/a/1.jpg'), 'the same URL, so the image does not reload');
});

test('only new pictures are signed', async () => {
  const { lib, signCalls } = load();
  await lib.signChatImages(['dm/a/1.jpg']);
  await lib.signChatImages(['dm/a/1.jpg', 'dm/a/3.jpg']);
  // Array.from: the array was built inside the sandbox, a different realm.
  assert.deepEqual(Array.from(signCalls[1]), ['dm/a/3.jpg']);
});

test('removing a picture forgets its link', async () => {
  const { lib, signCalls, removed } = load();
  await lib.signChatImages(['dm/a/1.jpg']);
  await lib.removeChatImage('dm/a/1.jpg');
  assert.deepEqual(removed, ['dm/a/1.jpg']);
  await lib.signChatImages(['dm/a/1.jpg']);
  assert.equal(signCalls.length, 2, 'a removed picture is not served from the cache');
});

// The queue an admin works sorts by subject_type. The keyword triggers write
// singular labels ('message'); Gwin must write the same ones, or one surface
// shows up as two.
test('Gwin files under the same labels the keyword triggers use', () => {
  const fn = readFileSync(join(__dirname, '../../supabase/functions/gwin/index.ts'), 'utf8');
  const migrations = ['2026-09-20_content_moderation.sql', '2026-10-03_chat_images.sql']
    .map((file) => { try { return readFileSync(join(__dirname, '../../db/migrations', file), 'utf8'); } catch { return ''; } })
    .join('\n');
  for (const [table, label] of [
    ['messages', 'message'], ['community_messages', 'community_message'], ['users', 'user'],
    ['coach_profiles', 'coach_profile'], ['partner_profiles', 'partner_profile'],
    ['profile_tags', 'profile_tag'], ['sport_requests', 'sport_request'],
  ]) {
    assert.ok(fn.includes(`${table}: "${label}"`), `the function must map ${table} to '${label}'`);
  }
  assert.ok(migrations.includes("flag_if_explicit('community_message', 'author_id', 'body')"),
    'community threads have the keyword trigger, under the singular label');
});
