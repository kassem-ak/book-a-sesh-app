// Run with: node scripts/check-community.cjs (no server or native runtime needed).
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { setImmediate: flush } = require('node:timers/promises');
const ts = require('typescript');
const React = require('react');
const { createStore } = require('zustand/vanilla');
const { createClient } = require('@supabase/supabase-js');

function load(file, imports = {}) {
  const source = readFileSync(join(__dirname, '../src', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  }, exports);
  return exports;
}

async function main() {
  const communities = ['owner', 'admin', 'moderator', 'member'].map((role, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i}`,
    slug: i === 3 ? null : `${role}-crew`, name: `${role} crew`,
  }));
  const memberships = communities.map((row, i) => ({
    community_id: row.id, role: ['owner', 'admin', 'moderator', 'member'][i],
  }));
  memberships.push({ community_id: 'unavailable-community', role: 'owner' });
  let session = { user: { id: 'auth-id' } };
  let failMemberships = false;
  let releaseCommunities;
  let communitiesReady = new Promise((resolve) => { releaseCommunities = resolve; });
  let resolvedUserCount = 0;
  const requests = [];
  const client = createClient('https://community-check.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input) => {
      const url = new URL(input);
      requests.push(url);
      const table = url.pathname.split('/').pop();
      if (table === 'communities') await communitiesReady;
      const failed = table === 'community_members' && failMemberships;
      const data = failed ? { message: 'offline' }
        : table === 'communities' ? communities : table === 'community_members' ? memberships : [];
      return new Response(JSON.stringify(data), { status: failed ? 503 : 200 });
    } },
  });
  const queries = load('lib/queries.ts', {
    './supabase': { supabase: { from: client.from.bind(client), auth: {
      getSession: async () => ({ data: { session }, error: null }),
    } } },
    './bookings': { currentAppUserId: async () => { resolvedUserCount++; return 'app-user-id'; } },
    './session': { ensureAppSession: async () => {} }, '../state/models': {}, './geo': {},
  });
  const { useStore } = load('state/store.ts', {
    zustand: { create: (init) => {
      const api = createStore(init);
      return Object.assign((select = (state) => state) => select(api.getState()), api);
    } },
    '../lib/queries': queries, './models': {}, '../lib/courts': {},
    '../lib/moderation': {}, './courtsData': {}, './sampleData': load('state/sampleData.ts'),
  });
  let effect;
  const { CommunityScreen } = load('screens/CommunityScreen.tsx', {
    react: { ...React, useEffect: (run) => { effect = run; } }, 'react-native': {},
    '../components/ui': {}, '../lib/queries': queries, '../state/store': { useStore },
    '../theme': { useTheme: () => ({ c: {}, t: {} }) },
  });
  const mount = () => { CommunityScreen(); return effect(); };
  const membershipRequests = () => requests.filter((url) => url.pathname.endsWith('/community_members'));

  const cleanup = mount();
  await flush();
  assert.equal(membershipRequests().length, 0, 'Membership loading must wait for communities');
  releaseCommunities();
  await flush();
  const state = useStore.getState();
  assert.deepEqual(state.joinedCommunities, ['owner-crew', 'admin-crew', 'moderator-crew', communities[3].id]);
  assert.equal(state.currentCommunityRole('owner-crew'), 'ADMIN');
  assert.equal(state.currentCommunityRole('admin-crew'), 'ADMIN');
  assert.equal(state.currentCommunityRole('moderator-crew'), 'MODERATOR');
  assert.equal(state.currentCommunityRole(communities[3].id), 'MEMBER');
  assert.equal(state.canAdminCommunity('owner-crew'), true);
  assert.equal(state.canModerateCommunity('moderator-crew'), true);
  assert.equal(state.canModerateCommunity(communities[3].id), false);
  assert.equal(membershipRequests().length, 1, 'Fetch all memberships in one table request');
  assert.equal(membershipRequests()[0].searchParams.get('select'), 'community_id,role');
  assert.equal(membershipRequests()[0].searchParams.get('user_id'), 'eq.app-user-id');
  cleanup();

  failMemberships = true;
  const cleanupFailure = mount();
  await flush();
  assert.strictEqual(useStore.getState().joinedCommunities, state.joinedCommunities);
  assert.strictEqual(useStore.getState().communityRoles, state.communityRoles);
  assert.equal(useStore.getState().remoteCommunities.length, 4);
  assert.equal(useStore.getState().writeError, null);
  cleanupFailure();

  session = null;
  const requestsBeforeGuest = membershipRequests().length;
  const resolvedBeforeGuest = resolvedUserCount;
  const cleanupGuest = mount();
  await flush();
  assert.deepEqual(useStore.getState().joinedCommunities, []);
  assert.deepEqual(useStore.getState().communityRoles, {});
  assert.equal(membershipRequests().length, requestsBeforeGuest);
  assert.equal(resolvedUserCount, resolvedBeforeGuest, 'A signed-out guest must not resolve/create a session');
  cleanupGuest();

  communitiesReady = new Promise((resolve) => { releaseCommunities = resolve; });
  const cleanupCancelled = mount();
  cleanupCancelled();
  const beforeCancelled = useStore.getState();
  releaseCommunities();
  await flush();
  assert.strictEqual(useStore.getState(), beforeCancelled, 'Unmounted loads must not update the store');

  const before = Date.now();
  await queries.fetchEvents();
  const params = requests.at(-1).searchParams;
  const filter = params.get('or');
  assert.match(filter, /^\(starts_at\.gte\.(.+),starts_at\.is\.null\)$/);
  const cutoff = Date.parse(filter.match(/^\(starts_at\.gte\.([^,]+)/)[1]);
  assert.ok(cutoff >= before && cutoff <= Date.now(), 'Use the current instant, not midnight or a fixed date');
  assert.equal(params.get('order'), 'starts_at.asc.nullslast');
  console.log('PASS: membership hydration, roles, UUID/slug mapping, one scoped request, failure preservation, guest, cancellation, upcoming/null event filter.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
