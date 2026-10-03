// Run: node --test tests/registration.test.cjs
// One registration form, whatever the way in.
//
// Single sign-on used to skip role, interests and area entirely, so two people
// who joined on the same day by different buttons ended up with different kinds
// of account. Every method now signs in first and lands on the same form.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const transpile = (file) => ts.transpileModule(readFileSync(join(__dirname, '..', file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

// --- what a provider told us -------------------------------------------------

function loadRegistration() {
  const exports = {};
  runInNewContext(transpile('src/lib/registration.ts'), {
    exports,
    require: () => ({}),
  });
  return exports;
}

test('a provider name is read whichever key it arrived under', () => {
  const { nameFromMetadata } = loadRegistration();
  assert.equal(nameFromMetadata({ full_name: 'Kassem Abu Khana', name: 'kassem' }), 'Kassem Abu Khana',
    'full_name wins: Google and Microsoft send both, and it is the complete one');
  assert.equal(nameFromMetadata({ name: 'Sara' }), 'Sara', 'Facebook sends only name');
  assert.equal(nameFromMetadata({ full_name: '  Rami  ' }), 'Rami');
});

// Apple sends the name on the first sign-in only. With nothing to go on the
// field starts empty -- never with the email prefix the database falls back to,
// which nobody actually told us.
test('no name is filled in when the provider gave none', () => {
  const { nameFromMetadata } = loadRegistration();
  assert.equal(nameFromMetadata({}), '');
  assert.equal(nameFromMetadata(null), '');
  assert.equal(nameFromMetadata({ full_name: '   ' }), '');
});

test('a provider photo is only taken over https', () => {
  const { avatarFromMetadata } = loadRegistration();
  assert.equal(avatarFromMetadata({ avatar_url: 'https://lh3.example/a.jpg' }), 'https://lh3.example/a.jpg');
  assert.equal(avatarFromMetadata({ picture: 'https://graph.example/p' }), 'https://graph.example/p');
  // It goes straight into an <Image>.
  assert.equal(avatarFromMetadata({ avatar_url: 'javascript:alert(1)' }), null);
  assert.equal(avatarFromMetadata({ avatar_url: 'http://insecure.example/a.jpg' }), null);
  assert.equal(avatarFromMetadata({}), null);
});

// --- the gate ----------------------------------------------------------------

function renderRoot({ registration, failProfile = false }) {
  // Mutable, like the database: once the form is finished the profile row exists.
  const current = { registration };
  const slots = [];
  const effects = [];
  let cursor = 0;
  const state = {
    authUid: 'sso-user', tab: 'discover', modules: [], profileRevision: 0, loaded: {},
    set(key, value) { this[key] = value; },
    setRemotePeople() {}, refreshRole() {}, refreshBlocked() {}, refreshCircle() {},
  };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    Fragment: 'Fragment',
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], (value) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
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
  const useStore = (selector) => selector(state);
  useStore.getState = () => state;
  const dependencies = {
    react,
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../theme': { useTheme: () => ({ c: {} }) },
    '../components/ui': { Button: 'Button', BrandMark: 'BrandMark' },
    '../state/store': { useStore, errorMessage: (error) => error.message },
    '../lib/session': { ensureAppSession: async () => {}, signOutUser: async () => {} },
    '../lib/supabase': { assertSupabaseConfigured() {}, supabase: { auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    } } },
    '../lib/analytics': { identify() {} },
    '../lib/queries': { fetchCoaches: async () => [], fetchPartners: async () => [] },
    '../lib/modules': { fetchVisibleModules: async () => ['discover'] },
    '../lib/geolock': { fetchGeoStatus: async () => ({ allowed: true }) },
    '../lib/push': { registerPushToken: async () => {} },
    '../lib/registration': { fetchRegistration: async () => current.registration },
    '../lib/profiles': {
      applySignupProfile: async () => { if (failProfile) throw new Error('offline'); return false; },
      fetchMyProfile: async () => ({ id: 'profile', name: 'Member', city: '' }),
    },
  };
  const exports = {};
  runInNewContext(transpile('src/navigation/Root.tsx'), {
    exports, console,
    require: (id) => (id in dependencies ? dependencies[id] : { [id.split('/').at(-1)]: id.split('/').at(-1) }),
  });
  const render = () => {
    cursor = 0;
    const tree = exports.Root();
    effects.splice(0).forEach((effect) => effect());
    return tree;
  };
  const settle = async () => { render(); await new Promise(setImmediate); await new Promise(setImmediate); return render(); };
  const nodes = (tree) => (tree && typeof tree === 'object' ? [tree, ...tree.children.flatMap(nodes)] : []);
  return { settle, nodes, state, current };
}

const PREFILL = { name: 'Kassem', email: 'k@example.com', avatarUrl: null, provider: 'google' };

test('an account with no profile lands on the form, not in the app', async () => {
  const root = renderRoot({ registration: { complete: false, prefill: PREFILL } });
  const tree = await root.settle();
  const form = root.nodes(tree).find((node) => node.type === 'CompleteRegistration');
  assert.ok(form, 'the registration form must be shown');
  assert.deepEqual(form.props.prefill, PREFILL, 'with what the provider told us');
  assert.ok(!root.nodes(tree).some((node) => node.type === 'DiscoverScreen'));
});

test('finishing the form opens the app', async () => {
  const root = renderRoot({ registration: { complete: false, prefill: PREFILL } });
  let tree = await root.settle();
  root.current.registration = { complete: true, prefill: PREFILL };
  root.nodes(tree).find((node) => node.type === 'CompleteRegistration').props.onDone();
  tree = await root.settle();
  assert.ok(!root.nodes(tree).some((node) => node.type === 'CompleteRegistration'));
});

test('a registered account goes straight in', async () => {
  const root = renderRoot({ registration: { complete: true, prefill: PREFILL } });
  const tree = await root.settle();
  assert.ok(root.nodes(tree).some((node) => node.type === 'DiscoverScreen'));
});

// The regression this guards: before the fallback, a failure in setup left
// registration unknown and the screen blank for good.
test('when setup fails, the app still opens', async () => {
  const root = renderRoot({ registration: { complete: false, prefill: PREFILL }, failProfile: true });
  const tree = await root.settle();
  assert.ok(root.nodes(tree).some((node) => node.type === 'DiscoverScreen'),
    'a network failure must not leave a blank screen');
});
