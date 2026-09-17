// Run from the project root: node .orchestration/profile-flow-check.cjs
// Exercises the production data helpers without changing a live account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../expo-app/node_modules/typescript');
const root = path.join(__dirname, '../expo-app/src/lib');
function load(name, imports) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (key) => {
    assert.ok(key in imports, `Unexpected import: ${key}`);
    return imports[key];
  }, URL, Date, Uint8Array, ArrayBuffer, DataView, atob, console });
  return exports;
}

const persisted = new Map();
const signup = load('signup', { '@react-native-async-storage/async-storage': { __esModule: true, default: {
  getItem: async (key) => persisted.get(key) ?? null,
  setItem: async (key, value) => persisted.set(key, value),
  removeItem: async (key) => persisted.delete(key),
} } });
let user;
let rows;
let failWrite;
let operations;
let objects;
const base = 'https://project.example/storage/v1/object/public/avatars';
function reset() {
  persisted.clear();
  user = { id: 'auth-uid', email: 'member@example.com', is_anonymous: false, user_metadata: {} };
  rows = {
    users: [{ id: 'app-user-id', name: 'Member', avatar_url: null }],
    coach_profiles: [], partner_profiles: [], profile_tags: [],
    sports: [{ id: 'tennis', name: 'Tennis', kind: 'sport', approved: true }, { id: 'chess', name: 'Chess', kind: 'hobby', approved: true }],
  };
  failWrite = null;
  operations = [];
  objects = new Map();
}
const supabase = {
  auth: {
    getUser: async () => ({ data: { user }, error: null }),
    updateUser: async ({ data }) => { Object.assign(user.user_metadata, data); return { error: null }; },
  },
  from(table) {
    let action = 'select', payload, options, single = false;
    const filters = [];
    const query = {
      select() { return query; }, order() { return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
      maybeSingle() { single = true; return query; }, single() { single = true; return query; },
      upsert(data, opts) { action = 'upsert'; payload = data; options = opts; return query; },
      update(data) { action = 'update'; payload = data; return query; },
      delete() { action = 'delete'; return query; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          const matches = (row) => filters.every((filter) => filter(row));
          if (action !== 'select') operations.push({ table, action, payload });
          if (failWrite === table && action !== 'select') {
            failWrite = null;
            return { data: null, error: new Error('Simulated write failure') };
          }
          if (action === 'upsert') for (const row of Array.isArray(payload) ? payload : [payload]) {
            const existing = rows[table].find((value) => options.onConflict.split(',').every((key) => row[key] === value[key]));
            if (!existing) rows[table].push({ ...row });
            else if (!options.ignoreDuplicates) Object.assign(existing, row);
          }
          if (action === 'update') rows[table].filter(matches).forEach((row) => Object.assign(row, payload));
          if (action === 'delete') rows[table] = rows[table].filter((row) => !matches(row));
          const data = rows[table].filter(matches);
          return { data: single ? data[0] ?? null : data, error: null };
        }).then(resolve, reject);
      },
    };
    return query;
  },
  storage: { from: () => ({
    getPublicUrl: (key) => ({ data: { publicUrl: `${base}/${key}` } }),
    upload: async (key, bytes, options) => {
      assert.equal(key.split('/')[0], user.id, 'Storage must use the AUTH uid');
      assert.notEqual(key.split('/')[0], rows.users[0].id);
      objects.set(key, { bytes, options });
      return { error: null };
    },
    remove: async (keys) => { keys.forEach((key) => objects.delete(key)); return { error: null }; },
  }) },
};
const profiles = load('profiles', { './bookings': { currentAppUserId: async () => 'app-user-id' }, './signup': signup, './supabase': { supabase } });
const avatars = load('avatars', { 'expo-image-picker': {}, './profiles': profiles, './supabase': { supabase } });

(async () => {
  reset();
  await signup.saveSignupDraft({ role: 'coach', sportIds: ['chess', 'tennis'] });
  user.is_anonymous = true;
  await assert.rejects(profiles.applySignupProfile(user.id), /Sign in/);
  assert.equal(operations.length, 0, 'Guest must not write profiles or tags');
  user.is_anonymous = false;
  failWrite = 'profile_tags';
  await assert.rejects(profiles.applySignupProfile(user.id), /Simulated/);
  assert.equal((await signup.readSignupDraft()).authUid, user.id, 'Failed setup remains bound to this account');
  await profiles.applySignupProfile(user.id);
  await profiles.applySignupProfile(user.id);
  assert.equal(rows.coach_profiles.length, 1);
  assert.equal(rows.coach_profiles[0].user_id, 'app-user-id');
  assert.equal(rows.coach_profiles[0].sport_id, 'chess');
  assert.equal(rows.profile_tags.length, 2);
  assert.equal(await signup.readSignupDraft(), null);
  assert.ok(operations.every(({ payload }) => !payload || !('verified' in payload || 'subscription_status' in payload)));

  const profile = await profiles.fetchMyProfile();
  rows.profile_tags.push({ user_id: 'app-user-id', tag: 'Unrelated specialty' });
  await profiles.saveMyProfile({ ...profile, name: 'Updated', bio: 'My bio', sportIds: ['tennis'], headline: 'Teacher', level: 'Advanced' });
  assert.equal(rows.coach_profiles[0].sport_id, 'tennis');
  assert.equal(rows.coach_profiles[0].headline, 'Teacher');
  assert.equal(rows.users[0].name, 'Updated');
  assert.deepEqual(rows.profile_tags.map((row) => row.tag).sort(), ['Tennis', 'Unrelated specialty']);

  reset();
  user.user_metadata = { signup_role: 'coach', signup_sports: ['chess'] };
  await profiles.applySignupProfile(user.id);
  assert.equal(rows.coach_profiles[0].sport_id, 'chess', 'Email metadata survives another device');
  assert.equal(user.user_metadata.signup_role, null);
  reset();
  await signup.saveSignupDraft({ role: 'coach', sportIds: ['tennis'], email: 'someone-else@example.com' });
  await profiles.applySignupProfile(user.id);
  assert.equal(rows.coach_profiles.length, 0, 'Another email cannot inherit the pending role');
  assert.equal(rows.partner_profiles.length, 1);
  assert.ok(await signup.readSignupDraft(), 'Keep the other email confirmation pending');
  reset();
  await signup.saveSignupDraft({ role: 'member', sportIds: ['tennis', 'chess'] });
  await Promise.all([profiles.applySignupProfile(user.id), profiles.applySignupProfile(user.id)]);
  assert.equal(rows.partner_profiles.length, 1);
  assert.equal(rows.profile_tags.length, 2);

  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(avatars.avatarMimeType(png), 'image/png');
  assert.equal(avatars.avatarMimeType(Uint8Array.from([255, 216, 255])), 'image/jpeg');
  assert.equal(avatars.avatarMimeType(Buffer.from('RIFF0000WEBP')), 'image/webp');
  assert.equal(avatars.avatarMimeType(Buffer.from([0, 0, 0, 20, ...Buffer.from('ftypmif1'), 0, 0, 0, 0, ...Buffer.from('heic')])), 'image/heic');
  assert.throws(() => avatars.avatarMimeType(Buffer.from('GIF89a')), /JPEG, PNG, WebP or HEIC/);
  const limit = new Uint8Array(2 * 1024 * 1024); limit.set(png);
  assert.equal(avatars.avatarMimeType(limit), 'image/png');
  assert.throws(() => avatars.avatarMimeType(new Uint8Array(limit.length + 1)), /2 MiB/);
  assert.equal(avatars.avatarObjectPath(`${base}/other-user/old.jpg`, base, user.id), null);
  assert.equal(avatars.avatarObjectPath(`${base}/auth-uid/old.jpg?v=123`, base, user.id), 'auth-uid/old.jpg');
  const photo = { bytes: png.buffer, uri: 'local-preview', mimeType: 'image/png' };
  await avatars.uploadAvatar(photo, 'app-user-id');
  await avatars.uploadAvatar(photo, 'app-user-id');
  assert.equal(objects.size, 1, 'Replacement reuses the storage object');
  rows.users[0].avatar_url = `${base}/auth-uid/legacy.jpg`;
  objects.clear(); objects.set('auth-uid/legacy.jpg', {});
  await avatars.uploadAvatar(photo, 'app-user-id');
  assert.equal(objects.size, 1, 'Legacy owned keys are reused too');
  failWrite = 'users';
  await assert.rejects(avatars.uploadAvatar(photo, 'app-user-id'), /Simulated/);
  assert.equal(objects.size, 1, 'Failed URL update keeps the existing referenced object');
  rows.users[0].avatar_url = null; objects.clear(); failWrite = 'users';
  await assert.rejects(avatars.uploadAvatar(photo, 'app-user-id'), /Simulated/);
  assert.equal(objects.size, 0, 'Failed first URL update cleans up its upload');
  await assert.rejects(avatars.uploadAvatar(photo, 'different-account'), /account changed/);
  console.log('PASS: guest isolation; coach/member signup; retry/concurrent idempotence; email binding; profile edits and tags; avatar formats/size/auth uid/replacement/cleanup.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
