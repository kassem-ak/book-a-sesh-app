// Run: node tests/sport-groups.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInThisContext } = require('node:vm');
const ts = require('typescript');

// The real helper, compiled from source: a copy of the logic in the test would
// keep passing after the screen's grouping changed.
function load() {
  const source = readFileSync(join(__dirname, '..', 'src', 'components', 'useSports.ts'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  // This realm, not a fresh one: arrays built in a new context are not the
  // same Array as the test's, and every deep comparison would fail on that
  // rather than on the grouping.
  //
  // The hook itself needs React and the network; the grouping does not.
  const stub = (name) => (name === 'react' ? { useEffect() {}, useState: () => [null, () => {}] } : {});
  runInThisContext('(function (exports, require, module) {' + js + '\n})')(exports, stub, { exports });

  return exports;
}

const catalogue = [
  { id: '1', name: 'Padel', kind: 'sport' },
  { id: '2', name: 'Tennis', kind: 'sport' },
  { id: '3', name: 'Chess', kind: 'hobby' },
];

test('the menu is two groups, sports before hobbies', () => {
  const { groupSports } = load();
  assert.deepEqual(groupSports(catalogue, '').map((group) => [group.label, group.items.map((s) => s.name)]), [
    ['Sports', ['Padel', 'Tennis']],
    ['Hobbies', ['Chess']],
  ]);
});

test('a group with nothing matching is dropped, not left as an empty heading', () => {
  const { groupSports } = load();
  assert.deepEqual(groupSports(catalogue, 'chess').map((group) => [group.label, group.items.map((s) => s.name)]),
    [['Hobbies', ['Chess']]]);
  assert.deepEqual(groupSports(catalogue, 'pad').map((group) => [group.label, group.items.map((s) => s.name)]),
    [['Sports', ['Padel']]]);
  assert.deepEqual(groupSports(catalogue, 'nothing here'), []);
});

test('an empty catalogue produces no headings at all', () => {
  const { groupSports } = load();
  assert.deepEqual(groupSports([], ''), []);
});
