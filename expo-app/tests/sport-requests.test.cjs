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

test('approve and reject persist the app-user reviewer and allow a fresh pending read', async () => {
  for (const status of ['approved', 'rejected']) {
    const saved = { id: 'request-a', status, reviewed_by: 'app-admin-id' };
    const h = harness([{ body: 'app-admin-id' }, { body: saved }, { body: [] }]);
    await h.api.decideSportRequest('request-a', status);
    assert.equal(h.sessions(), 1);
    assert.equal(h.calls[0].url.pathname, '/rest/v1/rpc/current_app_user');
    const write = h.calls[1];
    assert.equal(write.url.pathname, '/rest/v1/sport_requests');
    assert.equal(write.init.method, 'PATCH');
    assert.deepEqual(JSON.parse(write.init.body), { status, reviewed_by: 'app-admin-id' });
    assert.equal(write.url.searchParams.get('id'), 'eq.request-a');
    assert.equal(write.url.searchParams.get('status'), 'eq.pending');
    assert.equal(write.url.searchParams.get('select'), 'id,status,reviewed_by');
    assert.equal((await h.api.fetchPendingSportRequests()).length, 0);
    assert.equal(h.calls[2].init.method, 'GET');
  }
});

test('a denied write or a request already reviewed cannot report success', async () => {
  for (const status of [403, 406]) {
    const h = harness([
      { body: 'app-admin-id' },
      { status, body: { message: status === 403 ? 'Permission denied' : 'No pending row', code: status === 403 ? '42501' : 'PGRST116' } },
    ]);
    await assert.rejects(h.api.decideSportRequest('request-a', 'approved'));
    assert.equal(h.calls.length, 2);
  }
});
