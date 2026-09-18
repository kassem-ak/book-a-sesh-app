// Run: node tests/region-screen.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

test('a server region refusal replaces the profile error and offers retry and sign out', async () => {
  const slots = [];
  const effects = [];
  let cursor = 0;
  let allowed = false;
  let signedOut = false;
  let regionChecks = 0;
  const state = {
    authUid: 'microsoft-user', tab: 'discover', modules: [], profileRevision: 0, loaded: {},
    set(key, value) { this[key] = value; },
    setRemotePeople() {}, refreshRole() {}, refreshBlocked() {},
  };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((dep, j) => !Object.is(dep, slots[i].deps[j]))) {
        slots[i]?.cleanup?.();
        slots[i] = { deps };
        effects.push(() => { slots[i].cleanup = fn(); });
      }
    },
  };
  const useStore = selector => selector(state);
  useStore.getState = () => state;
  const dependencies = {
    react,
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../theme': { useTheme: () => ({ c: {} }) },
    '../state/store': { useStore, errorMessage: error => error.message },
    '../lib/session': { ensureAppSession: async () => {}, signOutUser: async () => { signedOut = true; } },
    '../lib/supabase': { assertSupabaseConfigured() {}, supabase: { auth: {
      onAuthStateChange: () => ({ data: { sub: { unsubscribe() {} } } }),
    } } },
    '../lib/analytics': { identify() {} },
    '../lib/queries': { fetchCoaches: async () => [], fetchPartners: async () => [] },
    '../lib/modules': { fetchVisibleModules: async () => ['discover'] },
    '../lib/geolock': { fetchGeoStatus: async () => { regionChecks++; return { allowed }; } },
    '../lib/profiles': {
      applySignupProfile: async () => { if (!allowed) throw new Error('This account has no profile yet.'); return false; },
      fetchMyProfile: async () => ({ id: 'profile', name: 'Member', city: '' }),
    },
  };
  const filename = join(__dirname, '../src/navigation/Root.tsx');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, console, require: id => {
    if (id in dependencies) return dependencies[id];
    const name = id.split('/').at(-1);
    return { [name]: name };
  } }, { filename });
  const render = () => {
    cursor = 0;
    const tree = exports.Root();
    effects.splice(0).forEach(effect => effect());
    return tree;
  };
  const settle = async () => { render(); await new Promise(setImmediate); return render(); };
  const nodes = tree => tree && typeof tree === 'object' ? [tree, ...tree.children.flatMap(nodes)] : [];
  const button = (tree, label) => nodes(tree).find(node => node.props.accessibilityLabel === label);
  let tree = await settle();
  assert.match(JSON.stringify(tree), /BOOK'D is not available in your region yet/);
  assert.doesNotMatch(JSON.stringify(tree), /This account has no profile yet/);
  assert.ok(!nodes(tree).some(node => node.type === 'DiscoverScreen'));
  await button(tree, 'Sign out').props.onPress();
  assert.equal(signedOut, true);
  allowed = true;
  button(tree, 'Check again').props.onPress();
  tree = await settle();
  assert.ok(regionChecks >= 2, 'retry must ask the server again');
  assert.ok(nodes(tree).some(node => node.type === 'DiscoverScreen'));
  state.authUid = null;
  tree = render();
  assert.equal(tree.type, 'AuthLanding');
});
