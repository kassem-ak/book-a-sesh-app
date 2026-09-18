// Run: node tests/sso.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

test('Microsoft requests email on web and native, preserving every provider callback', async () => {
  const filename = join(__dirname, '../src/lib/session.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const platform of ['web', 'android', 'ios']) {
    const calls = [];
    const exchanged = [];
    const dependencies = {
      'expo-linking': { createURL: path => `bookd://${path}` },
      'expo-web-browser': {
        maybeCompleteAuthSession() {},
        openAuthSessionAsync: async (url, callback) => {
          assert.equal(url, 'https://provider.example/authorize');
          assert.equal(callback, 'bookd://auth-callback');
          return { type: 'success', url: `${callback}?code=test-code` };
        },
      },
      'react-native': { Platform: { OS: platform } },
      './analytics': { track() {} },
      './signup': {},
      './supabase': {
        assertSupabaseConfigured() {},
        supabaseUrl: 'https://example.supabase.co',
        supabase: { auth: {
          getSession: async () => ({ data: { session: null } }),
          signInWithOAuth: async args => {
            calls.push(args);
            return { data: { url: 'https://provider.example/authorize' }, error: null };
          },
          exchangeCodeForSession: async value => { exchanged.push(value); return { error: null }; },
        } },
      },
    };
    const exports = {};
    runInNewContext(code, {
      exports, URL,
      require: id => { assert.ok(id in dependencies, `Unexpected import: ${id}`); return dependencies[id]; },
      fetch: async () => ({ status: 200 }),
      window: { location: { origin: 'https://www.app-bookd.com', pathname: '/' } },
    }, { filename });
    for (const provider of ['azure', 'google', 'facebook', 'apple']) {
      assert.equal(await exports.signInWithProvider(provider), platform !== 'web');
      const request = calls.at(-1);
      assert.equal(request.provider, provider);
      assert.equal(request.options.scopes, provider === 'azure' ? 'email' : undefined);
      assert.equal(request.options.redirectTo, platform === 'web' ? 'https://www.app-bookd.com/' : 'bookd://auth-callback');
      assert.equal(request.options.skipBrowserRedirect, platform === 'web' ? undefined : true);
    }
    assert.deepEqual(exchanged, platform === 'web' ? [] : Array(4).fill('test-code'));
  }
});
