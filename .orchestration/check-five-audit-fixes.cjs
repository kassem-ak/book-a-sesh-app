// Run from the project root: node .orchestration/check-five-audit-fixes.cjs
// Offline checks of production modules; no database writes or extra dependencies.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createRequire } = require('node:module');
const app = join(__dirname, '../expo-app');
const appRequire = createRequire(join(app, 'package.json'));
const ts = appRequire('typescript');
const React = appRequire('react');
const { createClient } = appRequire('@supabase/supabase-js');
const flush = () => new Promise(setImmediate);

function load(file, dependencies, env = {}) {
  const code = ts.transpileModule(readFileSync(join(app, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', 'process', code)((id) => {
    assert.ok(id in dependencies, `Unexpected import: ${id}`);
    return dependencies[id];
  }, exports, { env });
  return exports;
}

function queries(responses) {
  const calls = [];
  const supabase = createClient('https://example.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      calls.push({ url: new URL(url), init });
      assert.ok(responses.length, 'Unexpected request');
      const response = responses.shift();
      return new Response(JSON.stringify(response.body), {
        status: response.status ?? 200, headers: { 'Content-Type': 'application/json' },
      });
    } },
  });
  const api = load('src/lib/queries.ts', {
    './supabase': { supabase }, './session': { ensureAppSession: async () => 'auth-id' },
    './bookings': { currentAppUserId: async () => 'client-a' }, './geo': {},
  });
  return { api, calls };
}

// Execute the components' real handlers and mount effects with controlled state.
function screen(file, name, store, dependencies) {
  const states = [];
  let cursor = 0;
  let mounted = false;
  let effects = [];
  const react = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useEffect(effect) { if (!mounted) effects.push(effect); },
    useCallback: (fn) => fn,
  };
  const names = (...keys) => Object.fromEntries(keys.map((key) => [key, key]));
  const component = load(file, {
    react, 'react-native': names('Text', 'View', 'Pressable', 'ScrollView'),
    '../components/Overlay': names('MissingSubject', 'OverlayHeader', 'OverlayScaffold'),
    '../components/ui': names('Card', 'Row', 'Icon', 'VoltButton', 'SectionHeading', 'MicroBadge', 'Avatar'),
    '../state/store': { useStore: () => store, SCHED_TIMES: [] },
    '../theme': { useTheme: () => ({ c: {}, t: { microBadge: {}, labelSm: {} } }), alpha: () => '' },
    ...dependencies,
  })[name];
  return () => {
    cursor = 0;
    const tree = component();
    mounted = true;
    const pending = effects;
    effects = [];
    pending.forEach((effect) => effect());
    return tree;
  };
}

function nodes(tree) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [tree];
  if (typeof tree.type === 'function') return nodes(tree.type(tree.props));
  return [tree, ...nodes(tree.props.children), ...nodes(tree.props.bottomBar)];
}
const text = (tree) => nodes(tree).filter((x) => typeof x === 'string' || typeof x === 'number').join('');
const button = (tree, label) => nodes(tree).find((x) => x.props?.label === label || x.props?.accessibilityLabel === label);
const models = load('src/state/models.ts', {});

async function main() {
  for (const status of ['approved', 'rejected']) {
    const h = queries([{ body: [{ id: 'request-a', status }] }, { body: [] }]);
    await h.api.decideSportRequest('request-a', status);
    assert.equal(h.calls[0].url.pathname, '/rest/v1/rpc/decide_sport_request');
    assert.equal(h.calls[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(h.calls[0].init.body), { p_id: 'request-a', p_status: status });
    assert.deepEqual(await h.api.fetchPendingSportRequests(), []);
  }
  await assert.rejects(queries([{ body: [] }]).api.decideSportRequest('request-a', 'approved'), /already decided by someone else/);
  await assert.rejects(queries([{ status: 403, body: { message: 'admin required' } }]).api.decideSportRequest('request-a', 'approved'));

  for (const conflict of [false, true]) {
    let reads = 0;
    const h = queries([{ body: conflict ? [] : [{ id: 'request-a', status: 'approved' }] }]);
    const render = screen('src/overlays/AdminApprovalsOverlay.tsx', 'AdminApprovalsOverlay', { pendingRegistrations: [] }, {
      '../lib/queries': { ...h.api, fetchPendingSportRequests: async () => { reads++; return [{ id: 'request-a', name: 'Squash', kind: 'sport' }]; } },
    });
    render(); await flush();
    button(render(), 'Approve Squash').props.onPress(); await flush();
    if (conflict) assert.match(text(render()), /already decided by someone else/);
    else assert.equal(reads, 2, 'refresh after successful decision');
  }

  const balances = queries([{ body: [{ package_id: 'pack-a', used: 4, total: 10 }] }]);
  assert.deepEqual(await balances.api.fetchPackageUsage(), { 'pack-a': { used: 4, total: 10 } });
  assert.equal(balances.calls[0].url.searchParams.get('select'), 'package_id,used,total');
  assert.equal(balances.calls[0].url.searchParams.get('client_id'), 'eq.client-a');
  assert.deepEqual(await queries([{ body: [] }]).api.fetchPackageUsage(), {});
  assert.equal(await queries([{ status: 403, body: { message: 'denied' } }]).api.fetchPackageUsage(), null);

  function booking() {
    let resolve;
    const pending = new Promise((done) => { resolve = done; });
    const store = { bookPkg: 0, bookDay: 20, bookSlot: 0, booked: false,
      personById: () => ({ id: 'coach-a', name: 'Sam Coach', packages: [{ id: 'pack-a', sessions: 3, price: 120 }] }),
      confirmBooking: async () => { store.booked = true; },
    };
    const render = screen('src/overlays/BookingOverlay.tsx', 'BookingOverlay', store, {
      '../lib/queries': { fetchPackageUsage: () => pending }, '../state/models': models,
      '../state/sampleData': { slotDefs: ['8:00 AM'], daysInMonth: 30, firstDow: 2, todayNum: 16 },
    });
    return { render, resolve, store };
  }
  for (const usage of [undefined, null, {}, { 'pack-a': { used: 4, total: 10 } }, { 'pack-a': { used: 10, total: 10 } }, { 'pack-a': { used: 0, total: 10 } }]) {
    const h = booking();
    h.render();
    if (usage !== undefined) { h.resolve(usage); await flush(); }
    const tree = h.render();
    const footer = text(tree.props.bottomBar);
    if (usage == null) {
      assert.match(footer, usage === undefined ? /Loading…/ : /Unavailable/);
      assert.doesNotMatch(footer, /\$|[Pp]ayable|Included/);
      assert.equal(button(tree, 'Confirm booking').props.enabled, true);
      button(tree, 'Confirm booking').props.onPress();
      if (usage === undefined) { h.resolve({ 'pack-a': { used: 1, total: 10 } }); await flush(); }
      assert.doesNotMatch(text(h.render()), /payable|nothing extra to pay/);
    } else if (usage['pack-a']?.used === 10) {
      assert.equal(button(tree, 'Pack already used').props.enabled, false);
    } else if (usage['pack-a']) {
      assert.match(footer, /Due nowIncluded/);
      assert.match(footer, usage['pack-a'].used === 4 ? /6 of 10 sessions left/ : /10 of 10 sessions left/);
      button(tree, 'Confirm booking').props.onPress();
      assert.match(text(h.render()), /Covered by your pack/);
    } else {
      assert.match(footer, /\$120/);
      button(tree, 'Confirm booking').props.onPress();
      assert.match(text(h.render()), /\$120 is payable to Sam/);
    }
  }

  const inserts = [];
  const chain = { select() { return this; }, eq() { return this; }, order: async () => ({ data: [] }),
    insert(row) { inserts.push(row); return this; }, single: async () => ({ data: { id: 'new-pack' } }),
  };
  const renderCoach = screen('src/overlays/CoachOverlays.tsx', 'CoachPackagesOverlay', {}, {
    '../lib/bookings': { currentAppUserId: async () => 'coach-a', formatCents: (cents) => `$${cents / 100}` },
    '../lib/session': { ensureAppSession: async () => {} }, '../lib/supabase': { supabase: { from: () => chain } },
    '../state/models': models,
  });
  renderCoach(); await flush();
  let tree = renderCoach();
  assert.doesNotMatch(text(tree), /10-session pack|\$380/);
  assert.equal(button(tree, 'Add package').props.enabled, false);
  button(tree, 'Add package').props.onPress();
  assert.match(text(renderCoach()), /Choose the session count and total price/);
  assert.equal(inserts.length, 0);
  button(tree, 'Increase sessions for the new package').props.onPress();
  tree = renderCoach();
  assert.equal(button(tree, 'Add package').props.enabled, false);
  button(tree, 'Increase total price for the price of the new package').props.onPress();
  tree = renderCoach();
  assert.equal(button(tree, 'Add package').props.enabled, true);
  button(tree, 'Add package').props.onPress(); await flush();
  assert.deepEqual(inserts, [{ coach_id: 'coach-a', sessions: 1, price_cents: 500 }]);
  assert.equal(button(renderCoach(), 'Add package').props.enabled, false, 'next draft is neutral');

  const message = /EXPO_PUBLIC_SUPABASE_URL.*EXPO_PUBLIC_SUPABASE_ANON_KEY.*expo-app\/DEPLOY\.md/;
  const palette = load('src/theme/colors.ts', {});
  const { ErrorBoundary } = load('src/components/ErrorBoundary.tsx', {
    react: React, 'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable' }, '../theme/colors': palette,
  });
  for (const [url, key] of [[undefined, undefined], ['https://example.invalid', undefined], [undefined, 'key'], ['', 'key'], ['  ', 'key'], ['https://example.invalid', 'key']]) {
    const calls = [];
    const client = { auth: {}, from() {} };
    const config = load('src/lib/supabase.ts', {
      'react-native-url-polyfill/auto': {}, '@react-native-async-storage/async-storage': {},
      '@supabase/supabase-js': { createClient: (...args) => { calls.push(args); return client; } }, 'react-native': { Platform: { OS: 'web' } },
    }, { EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_ANON_KEY: key });
    if (url?.trim() && key) {
      assert.equal(config.isSupabaseConfigured, true);
      assert.doesNotThrow(config.assertSupabaseConfigured);
      assert.equal(config.supabase, client);
      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0].slice(0, 2), [url, key]);
      continue;
    }
    assert.equal(config.isSupabaseConfigured, false);
    assert.equal(calls.length, 0, 'no fallback client created');
    assert.throws(() => config.supabase.from('coach_profiles'), message);
    const session = load('src/lib/session.ts', {
      './supabase': config, 'expo-linking': {}, 'expo-web-browser': { maybeCompleteAuthSession() {} }, 'react-native': { Platform: { OS: 'web' } },
    });
    for (const action of [() => session.ensureAppSession(), () => session.signInEmail('a', 'b'), () => session.signUpEmail('a', 'b', 'c'), () => session.signInWithProvider('google')]) {
      await assert.rejects(action, message);
    }
    // Root must throw during render, not during module import or an async effect.
    const source = readFileSync(join(app, 'src/navigation/Root.tsx'), 'utf8');
    const dependencies = Object.fromEntries([...source.matchAll(/from '([^']+)'/g)].map((match) => [match[1], {}]));
    dependencies['../lib/supabase'] = config;
    const { Root } = load('src/navigation/Root.tsx', dependencies);
    let caught;
    try { Root(); } catch (error) { caught = error; }
    assert.match(caught?.message ?? '', message);
    const boundary = new ErrorBoundary({ isDark: false, children: null });
    boundary.state = ErrorBoundary.getDerivedStateFromError(caught);
    assert.match(text(boundary.render()), message);
  }
  console.log('PASS: all five audit fixes (offline RPC, UI states, draft validation, config/error boundary)');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
