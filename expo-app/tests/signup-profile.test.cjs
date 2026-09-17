// Run: node tests/signup-profile.test.cjs
// A sign-in must not be mistaken for a sign-up: applySignupProfile returning
// true makes Root open the profile editor, so a login that returned true sent
// every returning user to the registration screen instead of the home tab.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

function harness({ user, draft }) {
  const calls = [];
  let cleared = false;
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      const target = new URL(url);
      calls.push(`${init?.method ?? 'GET'} ${target.pathname}`);
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  // Only the identity call is stubbed; the REST builder and its HTTP contract
  // stay real, so a changed table or column still shows up in `calls`.
  supabase.auth.getUser = async () => ({ data: { user }, error: null });
  supabase.auth.updateUser = async (attributes) => {
    calls.push(`PUT /auth/v1/user ${JSON.stringify(attributes.data)}`);
    return { data: { user }, error: null };
  };
  const dependencies = {
    './supabase': { supabase },
    './bookings': { currentAppUserId: async () => 'app-1' },
    './signup': {
      readSignupDraft: async () => draft,
      saveSignupDraft: async () => {},
      clearSignupDraft: async () => { cleared = true; },
    },
  };
  const filename = join(__dirname, '../src/lib/profiles.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (id) => {
    assert.ok(id in dependencies, `Unexpected import: ${id}`);
    return dependencies[id];
  } }, { filename });
  return { module: exports, calls, cleared: () => cleared };
}

const USER = { id: 'auth-1', email: 'a@example.com', is_anonymous: false, user_metadata: {} };

test('a plain sign-in creates nothing and reports no signup', async () => {
  const h = harness({ user: USER, draft: null });
  assert.equal(await h.module.applySignupProfile('auth-1'), false);
  assert.deepEqual(h.calls, []);
  assert.equal(h.cleared(), false);
});

test('a stored signup draft still applies and reports a signup', async () => {
  const h = harness({ user: USER, draft: { role: 'member', sportIds: [] } });
  assert.equal(await h.module.applySignupProfile('auth-1'), true);
  assert.ok(h.calls.some((call) => call.startsWith('POST /rest/v1/partner_profiles')));
  assert.equal(h.cleared(), true);
});

test('signup_role metadata applies when the draft was lost', async () => {
  const user = { ...USER, user_metadata: { signup_role: 'coach', signup_sports: [] } };
  const h = harness({ user, draft: null });
  assert.equal(await h.module.applySignupProfile('auth-1'), true);
  assert.ok(h.calls.some((call) => call.startsWith('POST /rest/v1/coach_profiles')));
});

test('a draft bound to another account is ignored', async () => {
  const h = harness({ user: USER, draft: { role: 'coach', sportIds: [], authUid: 'someone-else' } });
  assert.equal(await h.module.applySignupProfile('auth-1'), false);
});
