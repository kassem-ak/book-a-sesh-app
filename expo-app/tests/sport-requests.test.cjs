// Run: node tests/sport-requests.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

function harness(responses) {
  const calls = [];
  let sessions = 0;
  // Exercise the real query builder and HTTP contract without live writes.
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      calls.push({ url: new URL(url), init });
      const response = responses.shift();
      assert.ok(response, 'Unexpected HTTP request');
      return new Response(JSON.stringify(response.body), {
        status: response.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } },
  });
  const dependencies = {
    './supabase': { supabase },
    './session': { ensureAppSession: async () => { sessions++; return 'auth-user-id'; } },
    // bookings.ts now merges free partner sessions into the same list; sport
    // requests do not touch them.
    './partners': { fetchPartnerSessions: async () => [], decidePartnerSession: async () => {} },
    './geo': {},
  };
  function load(name) {
    const filename = join(__dirname, '../src/lib', `${name}.ts`);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    runInNewContext(code, { exports, require: (id) => {
      assert.ok(id in dependencies, `Unexpected import: ${id}`);
      return dependencies[id];
    } }, { filename });
    return exports;
  }
  dependencies['./bookings'] = load('bookings');
  return { api: load('queries'), calls, sessions: () => sessions };
}

test('pending requests preserve real names, kinds, zero votes and unknown votes', async () => {
  const rows = [
    { id: 'request-a', name: 'Test sport', kind: 'sport', votes: 0 },
    { id: 'request-b', name: 'Test hobby', kind: 'hobby', votes: null },
    { id: 'request-c', name: 'Another sport', kind: 'sport', votes: 7 },
  ];
  const h = harness([{ body: rows }]);
  assert.deepEqual(await h.api.fetchPendingSportRequests(), rows);
  assert.equal(h.sessions(), 1);
  assert.equal(h.calls[0].url.pathname, '/rest/v1/sport_requests');
  assert.equal(h.calls[0].url.searchParams.get('status'), 'eq.pending');
  assert.equal(h.calls[0].url.searchParams.get('order'), 'created_at.asc');
});

test('an empty queue succeeds; read errors do not become empty queues', async () => {
  const h = harness([
    { body: [] },
    { status: 403, body: { message: 'Permission denied', code: '42501' } },
  ]);
  assert.equal((await h.api.fetchPendingSportRequests()).length, 0);
  await assert.rejects(h.api.fetchPendingSportRequests(), { message: 'Permission denied' });
});

test('approve and reject go through the admin RPC, not a direct table write', async () => {
  // The client has SELECT and INSERT on sport_requests but NOT UPDATE, so the
  // original direct PATCH failed with permission denied for every admin. The
  // decision now goes through decide_sport_request, which is SECURITY DEFINER
  // and checks is_platform_admin itself.
  for (const status of ['approved', 'rejected']) {
    const h = harness([{ body: [{ id: 'request-a', status }] }, { body: [] }]);
    await h.api.decideSportRequest('request-a', status);

    const write = h.calls[0];
    assert.equal(write.url.pathname, '/rest/v1/rpc/decide_sport_request');
    assert.equal(write.init.method, 'POST');
    assert.deepEqual(JSON.parse(write.init.body), { p_id: 'request-a', p_status: status });
    // No PATCH against the table, and no separate current_app_user round-trip:
    // the function resolves the reviewer server-side.
    assert.ok(!h.calls.some((c) => c.url.pathname === '/rest/v1/sport_requests' && c.init.method === 'PATCH'));
    assert.ok(!h.calls.some((c) => c.url.pathname === '/rest/v1/rpc/current_app_user'));

    assert.equal((await h.api.fetchPendingSportRequests()).length, 0);
    assert.equal(h.calls[1].init.method, 'GET');
  }
});

test('an already-decided request is reported as a conflict, never as success', async () => {
  // The function only moves a still-pending row, so a second decision returns
  // zero rows. That must not look like it worked.
  const h = harness([{ body: [] }]);
  await assert.rejects(h.api.decideSportRequest('request-a', 'approved'), /already decided/i);
});

test('a refused decision surfaces the error', async () => {
  for (const [status, message] of [[403, 'Permission denied'], [400, 'only a platform admin can decide a request']]) {
    const h = harness([{ status, body: { message, code: status === 403 ? '42501' : 'P0001' } }]);
    await assert.rejects(h.api.decideSportRequest('request-a', 'approved'), { message });
    assert.equal(h.calls.length, 1);
  }
});
