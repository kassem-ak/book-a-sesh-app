const test = require('node:test');
const assert = require('node:assert');

// The server is the lock. These pin the client's two rules: it must not block
// on its own guess, and it must not treat a malformed answer as a refusal.
const decide = (result) => {
  const open = { allowed: true, country: null, mode: 'off' };
  if (!result || result.error) return open;
  const data = result.data;
  if (!Array.isArray(data) || data.length === 0) return open;
  const row = data[0];
  if (typeof row.allowed !== 'boolean') return open;
  return {
    allowed: row.allowed,
    country: typeof row.country === 'string' ? row.country : null,
    mode: typeof row.mode === 'string' ? row.mode : 'off',
  };
};

test('a refusal from the server blocks the app', () => {
  assert.equal(decide({ data: [{ allowed: false, country: 'DE', mode: 'block_list' }] }).allowed, false);
});

test('an allow from the server lets the app run', () => {
  assert.equal(decide({ data: [{ allowed: true, country: 'LB', mode: 'allow_list' }] }).allowed, true);
});

test('a failed lookup fails open rather than stranding the user', () => {
  // The server still refuses the data, so failing open blocks nobody the
  // server would have served -- it only avoids a false lockout offline.
  assert.equal(decide({ error: { message: 'network' } }).allowed, true);
  assert.equal(decide(null).allowed, true);
  assert.equal(decide({ data: [] }).allowed, true);
  assert.equal(decide({ data: null }).allowed, true);
});

test('a malformed allowed field is not read as a refusal', () => {
  assert.equal(decide({ data: [{ allowed: 'false' }] }).allowed, true);
  assert.equal(decide({ data: [{ allowed: 0 }] }).allowed, true);
});

test('a non-string country or mode degrades to a safe default', () => {
  const s = decide({ data: [{ allowed: false, country: 42, mode: null }] });
  assert.equal(s.allowed, false);
  assert.equal(s.country, null);
  assert.equal(s.mode, 'off');
});
