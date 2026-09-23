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
      // These tests are about behaviour once the migration has landed.
      : id === './schema' ? {
        fulfilmentSchemaReady: () => true, markFulfilmentSchemaMissing: () => {},
        ratingsSchemaReady: () => true, markRatingsSchemaMissing: () => {},
      }
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

// ---- shipping ahead of the migration ---------------------------------------
//
// PostgREST refuses a whole query that names a column the table does not have.
// A client deployed before its migration would therefore not degrade -- it
// would take My bookings down. This is the fallback that stops that.

function loadWithSchemaProbe() {
  const filename = join(__dirname, '../src/lib/bookings.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const selects = [];
  let ready = true;
  // A database that predates the migration: any select naming the stamps is
  // refused with 42703, exactly as PostgREST does.
  const builder = (columns) => {
    selects.push(columns);
    const missing = columns.includes('coach_confirmed_at');
    const result = missing
      ? { data: null, error: { code: '42703', message: 'column does not exist' } }
      : { data: [], error: null };
    const chain = {
      eq: () => chain,
      order: () => Promise.resolve(result),
      then: (fn) => Promise.resolve(result).then(fn),
    };
    return chain;
  };
  runInNewContext(code, {
    exports,
    require: (id) => (id === './supabase' ? { supabase: { from: () => ({ select: builder }) } }
      : id === './session' ? { currentAppUserId: async () => 'me', ensureAppSession: async () => {} }
      : id === './schema' ? {
        fulfilmentSchemaReady: () => ready,
        markFulfilmentSchemaMissing: () => { ready = false; },
        ratingsSchemaReady: () => true,
        markRatingsSchemaMissing: () => {},
      }
      : id === './partners' ? { fetchPartnerSessions: async () => [] }
      : {}),
    Date, JSON, Number, Math, Array, Object, String, Promise, Set, Map,
  }, { filename });
  return { module: exports, selects, isReady: () => ready };
}

test('a database without the stamps falls back instead of failing the screen', async () => {
  const h = loadWithSchemaProbe();
  const bookings = await h.module.fetchMyBookings();
  // The screen still renders: empty lists, not a thrown error.
  assert.deepEqual(Object.keys(bookings).sort(), ['past', 'upcoming']);
  // It asked for the stamps once, was refused, and asked again without them.
  assert.equal(h.selects.length, 2);
  assert.ok(h.selects[0].includes('coach_confirmed_at'));
  assert.ok(!h.selects[1].includes('coach_confirmed_at'));
  assert.equal(h.isReady(), false);
});

test('with no stamps in the database nobody is asked to confirm anything', async () => {
  const h = loadWithSchemaProbe();
  await h.module.fetchMyBookings();
  const past = {
    id: 'b1', kind: 'coach', withId: 'coach', withName: 'Coach', slotLabel: null,
    totalCents: 0, needsAnswer: false, coachConfirmed: false, clientConfirmed: false,
    status: 'confirmed', scheduledFor: PAST,
  };
  // Asking for an answer the database cannot record is worse than not asking.
  assert.equal(h.module.awaitsConfirmation(past, NOW), false);
});

// ---- the archive ------------------------------------------------------------
//
// A past session is one of three things, and which one decides what the
// archive offers: a completed session can be rated, a cancelled one cannot,
// and one nobody confirmed is still waiting on an answer.

test('a past session is sorted by how it ended', () => {
  const { pastOutcome } = load().module;
  const at = (status) => ({ ...base, status, scheduledFor: PAST });
  assert.equal(pastOutcome(at('completed')), 'completed');
  assert.equal(pastOutcome(at('cancelled')), 'cancelled');
  // Its time went by with neither party saying whether it happened. Neither
  // finished nor called off, and the group a person has to act on.
  assert.equal(pastOutcome(at('confirmed')), 'unconfirmed');
  assert.equal(pastOutcome(at('pending')), 'unconfirmed');
});

test('a rating names the session and its kind, and nothing about who is rated', async () => {
  const { module, calls } = load();
  await module.rateSession({ sessionId: 's1', kind: 'coach', stars: 4 });
  const rpc = calls.find((c) => c.name === 'rate_session');
  // The subject comes from who is asking, on the server. A client that could
  // name the subject could rate somebody it never trained with.
  assert.equal(rpc.args.p_session, 's1');
  assert.equal(rpc.args.p_stars, 4);
  assert.equal(rpc.args.p_kind, 'coach');
  assert.equal(rpc.args.p_skill_stars, null);
  assert.equal(rpc.args.p_feedback, null);
});

test('blank feedback is sent as nothing rather than as an empty note', async () => {
  const { module, calls } = load();
  await module.rateSession({ sessionId: 's1', kind: 'coach', stars: 5, feedback: '   ' });
  const rpc = calls.find((c) => c.name === 'rate_session');
  assert.equal(rpc.args.p_feedback, null);
});

test('a coach sends both numbers and the note', async () => {
  const { module, calls } = load();
  await module.rateSession({
    sessionId: 's1', kind: 'coach', stars: 4, skillStars: 3, feedback: '  Good hands.  ',
  });
  const rpc = calls.find((c) => c.name === 'rate_session');
  assert.equal(rpc.args.p_skill_stars, 3);
  assert.equal(rpc.args.p_feedback, 'Good hands.');
});

// ---- nobody trains with themselves -----------------------------------------
//
// The server refuses it and a trigger refuses it underneath that. What these
// cover is the client half: that the refusal is a sentence rather than a
// constraint violation, and that it happens before a round trip.

function packagesModule(meId) {
  const filename = join(__dirname, '../src/lib/packages.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const calls = [];
  runInNewContext(code, {
    exports,
    require: (id) => (
      id === './supabase'
        ? { supabase: { rpc: async (n, a) => { calls.push({ n, a }); return { data: 1, error: null }; } } }
        : id === './schema'
          ? { fulfilmentSchemaReady: () => true, markFulfilmentSchemaMissing: () => {} }
          : { currentAppUserId: async () => meId }
    ),
    Date, JSON, Number, Math, Array, Object, String, Promise, Set, Map, Error,
  }, { filename });
  return { module: exports, calls };
}

test('booking a package with yourself is refused before it is sent', async () => {
  const h = packagesModule('me');
  await assert.rejects(
    () => h.module.bookPackageSessions('me', 'pk1', [{ at: '2026-09-22T10:00:00Z', label: '10:00 AM' }]),
    /cannot book a session with yourself/,
  );
  // Not sent: a refusal that still makes the round trip is a refusal the
  // server had to catch.
  assert.equal(h.calls.length, 0);
});

test('booking a package with somebody else is unaffected', async () => {
  const h = packagesModule('me');
  await h.module.bookPackageSessions('coach', 'pk1', [{ at: '2026-09-22T10:00:00Z', label: '10:00 AM' }]);
  assert.equal(h.calls.filter((c) => c.n === 'book_package_sessions').length, 1);
});
