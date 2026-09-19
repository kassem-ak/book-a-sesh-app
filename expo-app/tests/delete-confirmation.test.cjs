// Run: node tests/delete-confirmation.test.cjs
// The gate in front of an irreversible action. The Edge Function does the
// deleting and is verified separately; what matters here is that the button
// cannot arm itself by accident, and that it does arm for someone who plainly
// meant it.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = join(__dirname, '../src/lib/session.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const stubs = {
    'expo-linking': { createURL: () => '' },
    'expo-web-browser': { maybeCompleteAuthSession: () => {}, openAuthSessionAsync: async () => ({ type: 'cancel' }) },
    'react-native': { Platform: { OS: 'web' } },
    './analytics': { identify: () => {}, track: () => {} },
    './supabase': { supabase: {}, assertSupabaseConfigured: () => {}, supabaseUrl: 'https://example.invalid' },
    './signup': { bindSignupEmail: async () => {}, readSignupDraft: async () => null },
    './push': { unregisterPushToken: async () => {} },
  };
  const exports = {};
  runInNewContext(code, { exports, require: (id) => {
    assert.ok(id in stubs, `Unexpected import: ${id}`);
    return stubs[id];
  }, Set, URL, Promise, Object, Error, String, fetch: async () => ({ status: 200, json: async () => ({}) }) }, { filename });
  return exports;
}

test('the empty field does not arm the button', () => {
  const { confirmsDeletion } = load();
  // This is what the field holds before anyone has decided anything.
  assert.equal(confirmsDeletion(''), false);
  assert.equal(confirmsDeletion('   '), false);
});

test('the word confirms, however the keyboard capitalised it', () => {
  const { confirmsDeletion } = load();
  assert.equal(confirmsDeletion('delete'), true);
  // Phone keyboards capitalise the first letter of a field. Someone who typed
  // this meant it, and refusing them only teaches distrust of the field.
  assert.equal(confirmsDeletion('Delete'), true);
  assert.equal(confirmsDeletion('DELETE'), true);
  assert.equal(confirmsDeletion('  delete  '), true);
});

test('anything that is not the word does not confirm', () => {
  const { confirmsDeletion } = load();
  assert.equal(confirmsDeletion('del'), false);
  assert.equal(confirmsDeletion('deleted'), false);
  assert.equal(confirmsDeletion('delete my account'), false);
  assert.equal(confirmsDeletion('remove'), false);
  // Not a fuzzy match: a near miss is someone who has not typed it yet.
  assert.equal(confirmsDeletion('dlete'), false);
});

test('the word shown to the user is the word that is checked', () => {
  const { confirmsDeletion, DELETE_WORD } = load();
  // The label interpolates DELETE_WORD, so a change to one that missed the
  // other would ask for a word the check does not accept.
  assert.equal(confirmsDeletion(DELETE_WORD), true);
});
