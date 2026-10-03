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

// Three layers now: kind, then category, then entry.
//
//   Sports  >  Racquet sports  >  Padel, Tennis
//   Hobbies >  Games & strategy >  Chess
const catalogue = [
  { id: '1', name: 'Padel',  kind: 'sport', category: 'Racquet sports',   categoryPosition: 70 },
  { id: '2', name: 'Tennis', kind: 'sport', category: 'Racquet sports',   categoryPosition: 70 },
  { id: '3', name: 'Boxing', kind: 'sport', category: 'Combat sports',    categoryPosition: 10 },
  { id: '4', name: 'Chess',  kind: 'hobby', category: 'Games & strategy', categoryPosition: 10 },
  // Nobody has placed this one yet.
  { id: '5', name: 'Sepak takraw', kind: 'sport', category: null, categoryPosition: 999 },
];

const shape = (layers) => layers.map((layer) => [
  layer.label,
  layer.categories.map((category) => [category.name, category.items.map((sport) => sport.name)]),
]);

test('sports before hobbies, categories in their own order, Other last', () => {
  const { layerSports } = load();
  assert.deepEqual(shape(layerSports(catalogue, '')), [
    ['Sports', [
      ['Combat sports', ['Boxing']],
      ['Racquet sports', ['Padel', 'Tennis']],
      ['Other sports', ['Sepak takraw']],
    ]],
    ['Hobbies', [['Games & strategy', ['Chess']]]],
  ]);
});

// The point of the layer: you can look for the kind of thing, not just its name.
test('a search matches the category as well as the name', () => {
  const { layerSports } = load();
  assert.deepEqual(shape(layerSports(catalogue, 'racquet')), [
    ['Sports', [['Racquet sports', ['Padel', 'Tennis']]]],
  ]);
});

test('an entry nobody has placed shows under Other, not under a blank heading', () => {
  const { layerSports } = load();
  assert.deepEqual(shape(layerSports(catalogue, 'takraw')), [
    ['Sports', [['Other sports', ['Sepak takraw']]]],
  ]);
});

test('a layer with nothing matching is dropped, not left as an empty heading', () => {
  const { layerSports } = load();
  assert.deepEqual(shape(layerSports(catalogue, 'chess')), [
    ['Hobbies', [['Games & strategy', ['Chess']]]],
  ]);
});

test('an empty catalogue produces no headings at all', () => {
  const { layerSports } = load();
  assert.deepEqual(layerSports([], ''), []);
  assert.deepEqual(layerSports(catalogue, 'nothing like this'), []);
});
