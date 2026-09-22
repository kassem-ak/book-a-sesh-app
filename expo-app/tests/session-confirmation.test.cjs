// Run: node tests/session-confirmation.test.cjs
//
// A session is only settled once BOTH parties say it happened. The server owns
// who may stamp what; what is checked here is which sessions the app asks
// about, because asking about the wrong one is how somebody ends up confirming
// a session that never took place.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = join(__dirname, '../src/lib/bookings.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const calls = [];
  const supabase = {
    rpc: async (name, args) => { calls.push({ name, args }); return { data: null, error: null }; },
  };
  runInNewContext(code, {
    exports,
    require: (id) => (id === './supabase' ? { supabase }
      : id === './session' ? { currentAppUserId: async () => 'me', ensureAppSession: async () => {} }
      : {}),
    Date, JSON, Number, Math, Array, Object, String, Promise, Set, Map,
  }, { filename });
  return { module: exports, calls };
}

const NOW = Date.parse('2026-09-22T12:00:00Z');
const PAST = '2026-09-22T10:00:00Z';
const FUTURE = '2026-09-22T14:00:00Z';
const base = {
  id: 'b1', kind: 'coach', withId: 'coach', withName: 'Coach Ada',
  slotLabel: null, totalCents: 4500, needsAnswer: false,
  coachConfirmed: false, clientConfirmed: false,
};

test('a session is asked about once its time has passed and it is still open', () => {
  const { awaitsConfirmation } = load().module;
  assert.equal(awaitsConfirmation({ ...base, status: 'confirmed', scheduledFor: PAST }, NOW), true);
  assert.equal(awaitsConfirmation({ ...base, status: 'pending', scheduledFor: PAST }, NOW), true);
});

test('a session that has not started yet is never asked about', () => {
  const { awaitsConfirmation } = load().module;
  // Confirming ahead of time invites confirming a session that then does not
  // happen, and a confirmation cannot be taken back.
  assert.equal(awaitsConfirmation({ ...base, status: 'confirmed', scheduledFor: FUTURE }, NOW), false);
});

test('nothing is asked about a session that is already settled or called off', () => {
  const { awaitsConfirmation } = load().module;
  assert.equal(awaitsConfirmation({ ...base, status: 'completed', scheduledFor: PAST }, NOW), false);
  assert.equal(awaitsConfirmation({ ...base, status: 'cancelled', scheduledFor: PAST }, NOW), false);
  assert.equal(awaitsConfirmation({ ...base, status: 'no_show', scheduledFor: PAST }, NOW), false);
});

test('a partner session is never asked about', () => {
  const { awaitsConfirmation } = load().module;
  // Free by definition, so there is nothing for a confirmation to settle.
  assert.equal(
    awaitsConfirmation({ ...base, kind: 'partner', status: 'confirmed', scheduledFor: PAST }, NOW),
    false,
  );
});

test('an unparseable date is not treated as long past', () => {
  const { awaitsConfirmation } = load().module;
  assert.equal(awaitsConfirmation({ ...base, status: 'confirmed', scheduledFor: 'nonsense' }, NOW), false);
});

test('confirming names only the session -- the server decides whose stamp it is', async () => {
  const { module, calls } = load();
  await module.confirmFulfilled('b1');
  const rpc = calls.find((c) => c.name === 'confirm_session_fulfilled');
  // No party is named: a client that could say which side it was stamping
  // could stamp the coach's.
  assert.equal(JSON.stringify(rpc.args), JSON.stringify({ p_booking: 'b1' }));
});
