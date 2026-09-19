// Run: node tests/account-standing.test.cjs
// Whether this account coaches, and whether it moderates, are two facts.
//
// They used to be one value, and 'ADMIN' returned before the coach lookup ran.
// An admin who also coaches was therefore never 'COACH', so their own profile
// offered to make them a coach and every coaching screen was hidden from them.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const ME = '00000000-0000-4000-8000-0000000000aa';

function harness({ rpcRole = 'USER', hasCoachProfile = false, anonymous = false } = {}) {
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url) => {
      const target = new URL(url);
      if (target.pathname.endsWith('/rpc/my_account_role')) {
        return new Response(JSON.stringify(rpcRole), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (target.pathname.endsWith('/coach_profiles')) {
        const body = hasCoachProfile ? { user_id: ME } : null;
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  // getSession is read directly rather than over HTTP, so it is stubbed here.
  supabase.auth.getSession = async () => ({
    data: { session: { user: { id: 'auth-id', is_anonymous: anonymous } } },
  });

  const filename = join(__dirname, '../src/lib/queries.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (id) => {
      if (id === './supabase') return { supabase };
      if (id === './session') return { ensureAppSession: async () => 'auth-id', currentAppUserId: async () => ME };
      if (id === './bookings') return { currentAppUserId: async () => ME };
      return new Proxy({}, { get: () => () => null });
    },
    URL, Response, Headers, Promise, Array, Object, JSON, Number, String, Math, Set, Boolean,
  }, { filename });
  return exports;
}

test('an admin who also coaches is both', async () => {
  const { fetchAccountStanding } = harness({ rpcRole: 'ADMIN', hasCoachProfile: true });
  const standing = await fetchAccountStanding();
  // This is the case that was broken: the badge is right, and the coaching
  // screens are still theirs.
  assert.equal(standing.role, 'ADMIN');
  assert.equal(standing.isCoach, true);
});

test('an admin who does not coach is not offered coaching screens', async () => {
  const { fetchAccountStanding } = harness({ rpcRole: 'ADMIN', hasCoachProfile: false });
  const standing = await fetchAccountStanding();
  assert.equal(standing.role, 'ADMIN');
  assert.equal(standing.isCoach, false);
});

test('an ordinary coach is COACH and coaches', async () => {
  const { fetchAccountStanding } = harness({ rpcRole: 'USER', hasCoachProfile: true });
  const standing = await fetchAccountStanding();
  assert.equal(standing.role, 'COACH');
  assert.equal(standing.isCoach, true);
});

test('a member is neither', async () => {
  const { fetchAccountStanding } = harness({ rpcRole: 'USER', hasCoachProfile: false });
  const standing = await fetchAccountStanding();
  assert.equal(standing.role, 'USER');
  assert.equal(standing.isCoach, false);
});

test('an anonymous session never counts as a coach', async () => {
  // Guest access is gone, but a stale anonymous token can still arrive. It must
  // not inherit coaching screens on the strength of a coach_profiles row it
  // does not own.
  const { fetchAccountStanding } = harness({ rpcRole: 'USER', hasCoachProfile: true, anonymous: true });
  const standing = await fetchAccountStanding();
  assert.equal(standing.isCoach, false);
});
