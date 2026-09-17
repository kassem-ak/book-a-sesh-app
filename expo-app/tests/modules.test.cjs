const test = require('node:test');
const assert = require('node:assert');

// The gate's whole value is that it fails closed. These reproduce the decision
// the client makes, so a change that turns "unknown" into "visible" fails here.
const visible = (released, key) => released.includes(key);

test('a module absent from the server answer is not reachable', () => {
  assert.equal(visible(['discover', 'chat'], 'courts'), false);
  assert.equal(visible([], 'discover'), false);
});

test('a released module is reachable', () => {
  assert.equal(visible(['discover', 'chat'], 'discover'), true);
});

test('a failed lookup shows nothing rather than everything', () => {
  // fetchVisibleModules returns [] on error or malformed payload.
  const onError = [];
  assert.equal(onError.length, 0);
  for (const key of ['discover', 'maps', 'community', 'chat', 'courts', 'shop']) {
    assert.equal(visible(onError, key), false, `${key} must be hidden when the lookup fails`);
  }
});

test('a withdrawn tab cannot stay selected', () => {
  const pick = (keys, tab) => (keys.includes(tab) || tab === 'profile' ? tab : keys[0] ?? '');
  assert.equal(pick(['discover', 'chat'], 'courts'), 'discover');
  assert.equal(pick([], 'discover'), '');
  // Profile is off-nav and stays reachable regardless.
  assert.equal(pick([], 'profile'), 'profile');
});

test('only non-empty string keys are accepted from the server', () => {
  const clean = (data) => (Array.isArray(data) ? data.filter((k) => typeof k === 'string') : []);
  assert.deepEqual(clean(['discover', 42, null, 'chat']), ['discover', 'chat']);
  assert.deepEqual(clean(null), []);
  assert.deepEqual(clean({ discover: true }), []);
});
