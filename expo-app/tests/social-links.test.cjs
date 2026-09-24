// Run: node --test tests/social-links.test.cjs
// A handle is stored, not a URL. These pin the two things that has to get
// right: whatever shape somebody pastes collapses to the same handle, and
// nothing that is not a handle gets past the field.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = join(__dirname, '../src/lib/socialLinks.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: () => ({
      socialLinksSchemaReady: () => true,
      markSocialLinksSchemaMissing: () => {},
      supabase: {},
    }),
    Array, Object, JSON, Number, String, Boolean, RegExp, encodeURIComponent,
  }, { filename });
  return exports;
}

test('every shape of the same Instagram account is one handle', () => {
  const { normaliseHandle } = load();
  for (const typed of [
    'kassem',
    '@kassem',
    '  @kassem  ',
    'instagram.com/kassem',
    'https://instagram.com/kassem',
    'https://www.instagram.com/kassem/',
    'https://instagram.com/kassem?igshid=tracking',
  ]) {
    assert.equal(normaliseHandle(typed), 'kassem', typed);
  }
});

test('a TikTok URL keeps the name and drops the at sign', () => {
  const { normaliseHandle } = load();
  assert.equal(normaliseHandle('https://www.tiktok.com/@kassem'), 'kassem');
});

test('nothing typed is null, not an empty string', () => {
  const { normaliseHandle } = load();
  assert.equal(normaliseHandle(''), null);
  assert.equal(normaliseHandle('   '), null);
  assert.equal(normaliseHandle(null), null);
  assert.equal(normaliseHandle('@'), null);
});

test('a handle that is not a handle is refused with a reason', () => {
  const { handleProblem } = load();
  assert.equal(handleProblem(null), null);
  assert.equal(handleProblem('kassem.ak_1'), null);
  // The things that make it not a username.
  assert.ok(handleProblem('two words'));
  assert.ok(handleProblem('kassem/extra'));
  assert.ok(handleProblem('x'.repeat(41)));
});

test('a handle reaches the right platform, escaped', () => {
  const { socialUrl } = load();
  assert.equal(socialUrl('instagram', 'kassem'), 'https://instagram.com/kassem');
  assert.equal(socialUrl('facebook', 'my.page'), 'https://facebook.com/my.page');
  // The @ belongs to TikTok's URL, not to the stored handle.
  assert.equal(socialUrl('tiktok', 'kassem'), 'https://tiktok.com/@kassem');
});

test('hasAnyHandle is false only when all three are empty', () => {
  const { hasAnyHandle } = load();
  assert.equal(hasAnyHandle({ instagram: null, facebook: null, tiktok: null }), false);
  assert.equal(hasAnyHandle({ instagram: null, facebook: 'page', tiktok: null }), true);
});
