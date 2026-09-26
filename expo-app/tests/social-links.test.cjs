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

// The field used to run the reducer on every keystroke. That looks tidy and
// cannot work: the reducer takes the last path segment of anything URL-shaped,
// so typing a link by hand rewrites the field under the cursor from the second
// slash onward. Only pasting ever survived, while the label promises both.
//
// SocialLinks now normalises on blur instead, which is what keeps the second
// case below from being what the person is left with. This pins the reason.
test('reducing on every keystroke destroys a typed link', () => {
  const { normaliseHandle } = load();
  const perKeystroke = (raw) => {
    let field = '';
    for (const ch of raw) field = normaliseHandle(field + ch) ?? '';
    return field;
  };
  const link = 'https://instagram.com/kassem';
  assert.equal(normaliseHandle(link), 'kassem', 'the whole string reduces correctly');
  assert.equal(
    perKeystroke(link), 'https:instagram.comkassem',
    'one character at a time does not -- which is why the field commits on blur',
  );
});

// --- the website, which is the one entry that really is a URL ----------------
//
// The handles are safe by construction: this app builds their URL, so the value
// can only ever point at instagram.com, facebook.com or tiktok.com. A website
// points wherever it says, and the profile turns it into a tap target -- so
// what it refuses matters more than what it accepts.

test('a typed site gets the scheme nobody types', () => {
  const { normaliseWebsite } = load();
  assert.equal(normaliseWebsite('bookd.com'), 'https://bookd.com');
  assert.equal(normaliseWebsite('  bookd.com/coach  '), 'https://bookd.com/coach');
  assert.equal(normaliseWebsite('http://bookd.com'), 'http://bookd.com', 'http is left alone');
  assert.equal(normaliseWebsite('https://bookd.com/'), 'https://bookd.com', 'a trailing slash goes');
  assert.equal(normaliseWebsite(''), null);
  assert.equal(normaliseWebsite(null), null);
});

// The important half. A scheme somebody actually typed is never replaced --
// rewriting 'javascript:alert(1)' into 'https://javascript:alert(1)' would hide
// the problem instead of reporting it.
test('a dangerous scheme is kept intact so it can be refused', () => {
  const { normaliseWebsite, websiteProblem } = load();
  for (const bad of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd']) {
    const cleaned = normaliseWebsite(bad);
    assert.equal(cleaned, bad, `${bad} must not be dressed up as https`);
    assert.match(websiteProblem(cleaned), /http and https/);
  }
});

test('a web address with credentials in it is refused', () => {
  const { normaliseWebsite, websiteProblem } = load();
  // Renders as the host and goes somewhere else -- the oldest trick there is.
  assert.match(websiteProblem(normaliseWebsite('https://bookd.com@evil.example')), /username and password/);
});

test('what is not a web address is refused', () => {
  const { normaliseWebsite, websiteProblem } = load();
  for (const bad of ['not a web address', 'localhost', 'https://nodot']) {
    assert.ok(websiteProblem(normaliseWebsite(bad)), `${bad} must be refused`);
  }
  assert.match(websiteProblem(`https://${'a'.repeat(250)}.com`), /longer than/);
});

test('a real site passes', () => {
  const { normaliseWebsite, websiteProblem } = load();
  for (const good of ['bookd.com', 'https://www.bookd.co.uk/coach/kassem?ref=1', 'http://sub-domain.bookd.io:8443/x']) {
    assert.equal(websiteProblem(normaliseWebsite(good)), null, good);
  }
});

// A website must never go through the handle reducer: that keeps the last path
// segment, so "https://bookd.com/coach" would be stored as "coach".
test('each platform is cleaned by its own rule', () => {
  const { normaliseValue } = load();
  assert.equal(normaliseValue('instagram', 'https://instagram.com/kassem'), 'kassem');
  assert.equal(normaliseValue('website', 'https://bookd.com/coach'), 'https://bookd.com/coach');
});

test('a website links to itself, a handle gets its platform prefixed', () => {
  const { socialUrl, socialLabel } = load();
  assert.equal(socialUrl('instagram', 'kassem'), 'https://instagram.com/kassem');
  assert.equal(socialUrl('website', 'https://bookd.com/a?b=c'), 'https://bookd.com/a?b=c',
    'no re-encoding -- that would break the path and the query');
  assert.equal(socialLabel('website', 'https://www.bookd.com/coach'), 'bookd.com/coach');
  assert.equal(socialLabel('instagram', 'kassem'), 'kassem');
});

// Three screens each compared the handles field by field, so adding the website
// was detected on two of them and silently ignored on the third.
test('a changed website counts as a change', () => {
  const { socialsDiffer, NO_SOCIALS } = load();
  assert.equal(socialsDiffer(NO_SOCIALS, NO_SOCIALS), false);
  assert.equal(socialsDiffer(NO_SOCIALS, { ...NO_SOCIALS, website: 'https://bookd.com' }), true);
  assert.equal(socialsDiffer(NO_SOCIALS, { ...NO_SOCIALS, tiktok: 'x' }), true);
});
