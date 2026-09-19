// Run: node tests/push.test.cjs
// What can go wrong on the client side of push is not the sending -- the
// database and Expo do that -- but the registration: asking again after someone
// already said no, writing the row against the wrong account, registering on a
// platform that has no push at all, or leaving the token behind when the person
// signs out so the next account on the phone gets their notifications.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const ME = '00000000-0000-4000-8000-0000000000aa';
const TOKEN = 'ExponentPushToken[test-device]';

function harness({ os = 'android', permission = { granted: false, canAskAgain: true }, projectId = 'test-project' } = {}) {
  const calls = [];
  const asked = { request: 0, channel: 0 };
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      const target = new URL(url);
      calls.push({
        method: init?.method ?? 'GET',
        path: target.pathname,
        query: target.search,
        body: init?.body ? JSON.parse(init.body) : null,
        prefer: new Headers(init?.headers ?? {}).get('prefer') ?? '',
      });
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });

  let current = { ...permission };
  const Notifications = {
    AndroidImportance: { DEFAULT: 3 },
    setNotificationHandler: () => {},
    setNotificationChannelAsync: async () => { asked.channel += 1; },
    getPermissionsAsync: async () => current,
    requestPermissionsAsync: async () => { asked.request += 1; current = { granted: true, canAskAgain: false }; return current; },
    getExpoPushTokenAsync: async () => ({ data: TOKEN }),
  };

  const dependencies = {
    './supabase': { supabase },
    'expo-notifications': Notifications,
    // __esModule matters: without it the interop helper wraps the stub a second
    // time and every Constants read comes back undefined -- which looks exactly
    // like "push is not configured" and quietly passes the wrong tests.
    'expo-constants': { __esModule: true, default: { expoConfig: { extra: projectId ? { eas: { projectId } } : {} } } },
    'react-native': { Platform: { OS: os } },
  };

  const filename = join(__dirname, '../src/lib/push.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (id) => {
      assert.ok(id in dependencies, `Unexpected import: ${id}`);
      return dependencies[id];
    },
    console: { warn: () => {} },
    URL, Response, Headers, Promise, Array, Map, Object, JSON, Date,
  }, { filename });
  return { module: exports, calls, asked };
}

test('a granted device registers its token against the signed-in account', async () => {
  const h = harness({ permission: { granted: true, canAskAgain: false } });
  assert.equal(await h.module.registerPushToken(ME), true);
  const write = h.calls.find((c) => c.method === 'POST' && c.path.endsWith('/push_tokens'));
  assert.ok(write, 'expected an upsert');
  const row = Array.isArray(write.body) ? write.body[0] : write.body;
  assert.equal(row.token, TOKEN);
  assert.equal(row.user_id, ME);
  assert.equal(row.platform, 'android');
  // Keyed on the token, so the same phone signing in as someone else moves the
  // row rather than leaving the old account's notifications pointed here.
  assert.match(write.prefer, /resolution=merge-duplicates/);
});

test('Android gets a channel, because without one it delivers nothing', async () => {
  const h = harness({ permission: { granted: true, canAskAgain: false } });
  await h.module.registerPushToken(ME);
  assert.equal(h.asked.channel, 1);
  const ios = harness({ os: 'ios', permission: { granted: true, canAskAgain: false } });
  await ios.module.registerPushToken(ME);
  assert.equal(ios.asked.channel, 0);
});

test('someone who said no is not asked again', async () => {
  const h = harness({ permission: { granted: false, canAskAgain: false } });
  assert.equal(await h.module.registerPushToken(ME), false);
  assert.equal(h.asked.request, 0, 'must not re-prompt');
  assert.equal(h.calls.filter((c) => c.method === 'POST').length, 0, 'nothing should be written');
});

test('a first-run device is asked once and then registers', async () => {
  const h = harness({ permission: { granted: false, canAskAgain: true } });
  assert.equal(await h.module.registerPushToken(ME), true);
  assert.equal(h.asked.request, 1);
});

test('web registers nothing -- Expo push does not reach it', async () => {
  const h = harness({ os: 'web', permission: { granted: true, canAskAgain: false } });
  assert.equal(await h.module.registerPushToken(ME), false);
  assert.equal(h.calls.length, 0);
  await h.module.unregisterPushToken();
  assert.equal(h.calls.length, 0);
});

test('without an EAS project id push stays off instead of throwing', async () => {
  const h = harness({ projectId: null, permission: { granted: true, canAskAgain: false } });
  assert.equal(await h.module.registerPushToken(ME), false);
  assert.equal(h.calls.length, 0);
});

test('signing out deletes this device only, by its own token', async () => {
  const h = harness({ permission: { granted: true, canAskAgain: false } });
  await h.module.unregisterPushToken();
  const del = h.calls.find((c) => c.method === 'DELETE');
  assert.ok(del, 'expected a delete');
  assert.ok(del.path.endsWith('/push_tokens'));
  assert.match(del.query, /token=eq\./);
  // Not user_id: the person's other devices keep receiving notifications.
  assert.doesNotMatch(del.query, /user_id/);
});

test('a device that never had permission has no token to release', async () => {
  const h = harness({ permission: { granted: false, canAskAgain: true } });
  await h.module.unregisterPushToken();
  assert.equal(h.calls.length, 0);
  assert.equal(h.asked.request, 0, 'sign-out must never prompt for permission');
});
