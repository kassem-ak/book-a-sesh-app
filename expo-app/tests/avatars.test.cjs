// Run: node tests/avatars.test.cjs
// `atob` is a browser global. Hermes does not provide it and Expo does not
// polyfill it, so the web build decoded photos while every native build threw
// ReferenceError as soon as one was chosen. decodeBase64 replaces it, and must
// agree with a known-good decoder byte for byte -- a decoder that is subtly
// wrong corrupts the upload instead of failing, which is harder to notice.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = join(__dirname, '../src/lib/avatars.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const stub = new Proxy({}, { get: () => () => null });
  // Deliberately NO atob in this sandbox: that is the native runtime's shape,
  // so a reintroduced `atob` call fails here instead of on a user's phone.
  const sandbox = {
    exports, Uint8Array, ArrayBuffer, DataView, String, Error, Math, Number, RegExp, JSON,
    require: () => stub,
  };
  runInNewContext(code, sandbox, { filename });
  assert.equal(typeof sandbox.atob, 'undefined', 'sandbox must not provide atob');
  return exports;
}

const { decodeBase64, avatarMimeType } = load();
const bytes = (b64) => Buffer.from(decodeBase64(b64));

test('matches Buffer for every byte value', () => {
  const all = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  assert.deepEqual(bytes(all.toString('base64')), all);
});

test('handles all three padding lengths', () => {
  for (const text of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
    const expected = Buffer.from(text, 'utf8');
    assert.deepEqual(bytes(expected.toString('base64')), expected, `round trip failed for ${JSON.stringify(text)}`);
  }
});

test('decodes with the padding stripped, as a data URL tail may be', () => {
  const expected = Buffer.from('ab', 'utf8');
  assert.deepEqual(bytes(expected.toString('base64').replace(/=+$/, '')), expected);
});

test('tolerates embedded whitespace and newlines', () => {
  const expected = Buffer.from('the quick brown fox', 'utf8');
  const wrapped = expected.toString('base64').replace(/(.{4})/g, '$1\n');
  assert.deepEqual(bytes(wrapped), expected);
});

test('rejects a character outside the alphabet rather than guessing', () => {
  assert.throws(() => decodeBase64('aa*a'), /choose it again/i);
});

test('returns an exact-size buffer, so .buffer is safe to upload', () => {
  const expected = Buffer.from('abcde', 'utf8');
  const out = decodeBase64(expected.toString('base64'));
  assert.equal(out.byteOffset, 0);
  assert.equal(out.length, expected.length);
  assert.equal(out.buffer.byteLength, expected.length, '.buffer must not carry trailing slack');
});

test('a decoded JPEG, PNG and WebP still sniff correctly end to end', () => {
  const cases = {
    'image/jpeg': [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'image/webp': [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')],
  };
  for (const [expected, header] of Object.entries(cases)) {
    const b64 = Buffer.from(header).toString('base64');
    assert.equal(avatarMimeType(decodeBase64(b64)), expected);
  }
});

test('an unrecognised header is refused', () => {
  assert.throws(() => avatarMimeType(decodeBase64(Buffer.from('not an image').toString('base64'))), /JPEG, PNG, WebP or HEIC/);
});
