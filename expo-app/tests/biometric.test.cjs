// Run: node --test tests/biometric.test.cjs
// Unlock with Face ID or a fingerprint.
//
// The rules that matter: it is never offered where it cannot work, and it can
// never be switched on by somebody who could not then open the app -- that
// would lock the owner out on the next launch.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load({ os = 'ios', hardware = true, enrolled = true, passes = true } = {}) {
  const store = new Map();
  const prompts = [];
  const localAuth = {
    AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2 },
    hasHardwareAsync: async () => hardware,
    isEnrolledAsync: async () => enrolled,
    supportedAuthenticationTypesAsync: async () => [2],
    authenticateAsync: async (options) => { prompts.push(options); return { success: passes }; },
  };
  const dependencies = {
    'react-native': { Platform: { OS: os } },
    '@react-native-async-storage/async-storage': { __esModule: true, default: {
      getItem: async (key) => store.get(key) ?? null,
      setItem: async (key, value) => { store.set(key, value); },
      removeItem: async (key) => { store.delete(key); },
    } },
    'expo-local-authentication': localAuth,
  };
  const code = ts.transpileModule(readFileSync(join(__dirname, '../src/lib/biometric.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (id) => {
      assert.ok(id in dependencies, `Unexpected import: ${id}`);
      return dependencies[id];
    },
    Promise,
  });
  return { lib: exports, store, prompts };
}

test('never offered on the web', async () => {
  const { lib } = load({ os: 'web' });
  assert.equal(await lib.biometricAvailable(), false);
  assert.equal(await lib.setBiometric('u1', true), false, 'and cannot be switched on there');
});

test('hardware alone is not enough: something must be enrolled', async () => {
  assert.equal(await load({ enrolled: false }).lib.biometricAvailable(), false);
  assert.equal(await load({ hardware: false }).lib.biometricAvailable(), false);
  assert.equal(await load().lib.biometricAvailable(), true);
});

// The important one. If this could be switched on without a working unlock,
// the next launch would put up a lock the owner cannot open.
test('switching it on needs a successful unlock first', async () => {
  const refused = load({ passes: false });
  assert.equal(await refused.lib.setBiometric('u1', true), false);
  assert.equal(await refused.lib.biometricEnabled('u1'), false, 'a failed unlock leaves it off');

  const allowed = load({ passes: true });
  assert.equal(await allowed.lib.setBiometric('u1', true), true);
  assert.equal(await allowed.lib.biometricEnabled('u1'), true);
  assert.equal(allowed.prompts.length, 1, 'the owner was actually asked');
});

test('switching it off asks nothing -- it only removes a lock', async () => {
  const { lib, prompts } = load();
  await lib.setBiometric('u1', true);
  prompts.length = 0;
  assert.equal(await lib.setBiometric('u1', false), true);
  assert.equal(await lib.biometricEnabled('u1'), false);
  assert.equal(prompts.length, 0);
});

test('the choice belongs to one account on this device, not every account', async () => {
  const { lib } = load();
  await lib.setBiometric('owner', true);
  assert.equal(await lib.biometricEnabled('owner'), true);
  assert.equal(await lib.biometricEnabled('somebody-else'), false);
});

test('the device passcode stays as a fallback', async () => {
  const { lib, prompts } = load();
  await lib.unlockWithBiometrics();
  assert.equal(prompts[0].disableDeviceFallback, false,
    'a cut finger or a mask must not lock the owner out of their own account');
});
