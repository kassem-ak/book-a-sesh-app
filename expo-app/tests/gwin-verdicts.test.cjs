// Run: node --test tests/gwin-verdicts.test.cjs
// How Gwin's replies are read.
//
// The two parsers live in the Edge Function (supabase/functions/gwin/index.ts),
// which Deno runs and this suite does not. They are lifted here character for
// character because they are the safety boundary, not a formatting detail:
//
//   * screening fails CLOSED. A refusal, a truncated reply, a line that is
//     neither FLAG nor CLEAR, an unreachable provider -- none of those is a
//     clearance, and "did not clear" has to mean "a human looks".
//   * a match is only ever a name already on the curated list, checked against
//     the list in code. The reply is text, and text that looks like an entry is
//     not an entry -- including a name the model invented.
//
// If the function's copies change, change these and say why.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

// --- the copies under test ---------------------------------------------------

function verdictFrom(reply, action) {
  const text = reply.trim();
  if (/^CLEAR\b/i.test(text)) return { flagged: false, reason: '', action };
  const reason = text.replace(/^FLAG\b[:.\s-]*/i, '').trim();
  return {
    flagged: true,
    reason: reason !== '' ? reason : 'Held for review: Gwin gave no usable verdict.',
    action,
  };
}

function mappingFrom(reply, curated, typed) {
  const found = reply.trim().match(/^MATCH\b[:.\s-]*(.+)$/i);
  if (found) {
    const named = found[1].trim().toLowerCase();
    const hit = curated.find((name) => name.toLowerCase() === named);
    if (hit) return { match: hit, request: null };
  }
  return { match: null, request: typed };
}

// A copy is only worth having if it is still a copy.
test('these parsers still match the ones the function ships', () => {
  const source = readFileSync(join(__dirname, '../../supabase/functions/gwin/index.ts'), 'utf8');
  for (const line of [
    'if (/^CLEAR\\b/i.test(text)) return { flagged: false, reason: "", action };',
    'const reason = text.replace(/^FLAG\\b[:.\\s-]*/i, "").trim();',
    'const found = reply.trim().match(/^MATCH\\b[:.\\s-]*(.+)$/i);',
  ]) {
    assert.ok(source.includes(line), `the function no longer contains: ${line}`);
  }
});

// --- screening ---------------------------------------------------------------

test('a clear reply clears', () => {
  assert.deepEqual(verdictFrom('CLEAR', 'flag'), { flagged: false, reason: '', action: 'flag' });
  assert.equal(verdictFrom('  clear  ', 'flag').flagged, false, 'case and space do not matter');
});

test('a flag carries its reason', () => {
  assert.deepEqual(verdictFrom('FLAG: sexual solicitation.', 'flag'), {
    flagged: true, reason: 'sexual solicitation.', action: 'flag',
  });
  assert.equal(verdictFrom('FLAG - propositioning a coach', 'flag').reason, 'propositioning a coach');
});

// The important half. Anything that is not an explicit clearance is a flag.
test('anything that is not a clearance is a flag', () => {
  for (const reply of [
    '',                                   // nothing came back
    'I am sorry, I cannot help with that.', // a refusal
    'FLAG',                               // truncated before the reason
    'Probably fine?',                     // neither word
    'The content appears to be',          // cut off mid-sentence
    'CLEARLY sexual content',             // starts with the letters, is not CLEAR
  ]) {
    assert.equal(verdictFrom(reply, 'flag').flagged, true, `must flag: ${JSON.stringify(reply)}`);
  }
});

test('a flag with no usable reason still says why it is here', () => {
  assert.match(verdictFrom('FLAG', 'flag').reason, /Held for review/);
  assert.match(verdictFrom('', 'flag').reason, /Held for review/);
});

// \b keeps CLEARLY from reading as CLEAR. Worth its own case: without it, the
// one reply that begins "CLEARLY sexual content" would clear itself.
test('the word boundary is what stops CLEARLY clearing', () => {
  assert.equal(verdictFrom('CLEARLY sexual content', 'flag').flagged, true);
  assert.equal(verdictFrom('CLEAR', 'flag').flagged, false);
});

test('the operator chosen action rides along untouched', () => {
  assert.equal(verdictFrom('FLAG: x', 'hide_and_flag').action, 'hide_and_flag');
  assert.equal(verdictFrom('CLEAR', 'hide_and_flag').action, 'hide_and_flag');
});

// --- mapping a sport ---------------------------------------------------------

const CURATED = ['Football', 'Freediving', 'Strength & Conditioning', 'Chess'];

test('a match resolves to the list entry, spelled the list way', () => {
  assert.deepEqual(mappingFrom('MATCH Football', CURATED, 'footy'), {
    match: 'Football', request: null,
  });
  assert.equal(mappingFrom('match: freediving', CURATED, 'free diving').match, 'Freediving',
    'case differences resolve to the curated spelling');
  assert.equal(mappingFrom('MATCH - Strength & Conditioning', CURATED, 'lifting').match,
    'Strength & Conditioning');
});

// A name that is not on the list character for character is a request, however
// confidently it was returned. This is the gate that keeps the taxonomy from
// growing on a model's word.
test('a name that is not on the list becomes a request', () => {
  for (const reply of ['MATCH Padel', 'MATCH Foot Ball', 'NEW Padel', 'Padel', '']) {
    assert.deepEqual(mappingFrom(reply, CURATED, 'padel'), { match: null, request: 'padel' },
      `must be a request: ${JSON.stringify(reply)}`);
  }
});

test('what the member typed is what gets requested, not what Gwin said', () => {
  // Gwin inventing a tidier name must not rewrite what the member is credited
  // with asking for.
  assert.equal(mappingFrom('NEW Paddle Tennis', CURATED, 'padel').request, 'padel');
});

// --- classifying a new entry -------------------------------------------------
//
// A category is only ever a row that already exists, named exactly. Anything
// else is NO category: the request stays held out of the admin queue and is
// asked again, rather than slipping through under a silent Other. (Other only
// arrives when the model names it, or after repeated unusable answers.)

function classificationFrom(reply, categories, fallbackKind) {
  const found = reply.trim().match(/^(SPORT|HOBBY)\b[:.\s-]*(.*)$/i);
  const kind = found ? found[1].toLowerCase() : fallbackKind;
  const named = (found?.[2] ?? '').trim().toLowerCase();
  const hit = categories.find((category) => category.kind === kind && category.name.toLowerCase() === named) ?? null;
  return { kind, category: hit };
}

const CATEGORIES = [
  { id: 'c1', kind: 'sport', name: 'Combat sports' },
  { id: 'c2', kind: 'sport', name: 'Water sports' },
  { id: 'c9', kind: 'sport', name: 'Other sports' },
  { id: 'h1', kind: 'hobby', name: 'Music' },
  { id: 'h9', kind: 'hobby', name: 'Other hobbies' },
];

test('the classifier still matches the one the function ships', () => {
  const source = readFileSync(join(__dirname, '../../supabase/functions/gwin/index.ts'), 'utf8');
  assert.ok(source.includes('const found = reply.trim().match(/^(SPORT|HOBBY)\\b[:.\\s-]*(.*)$/i);'),
    'the function no longer contains the classification parser');
  assert.ok(source.includes('category.kind === kind && category.name.toLowerCase() === named) ?? null;'),
    'the function must not fall back to Other inside the parser');
});

test('a clean reply files under its kind and category', () => {
  const sorted = classificationFrom('SPORT Water sports', CATEGORIES, 'sport');
  assert.equal(sorted.kind, 'sport');
  assert.equal(sorted.category.id, 'c2');
  assert.equal(classificationFrom('hobby: music', CATEGORIES, 'sport').category.id, 'h1',
    'case and punctuation do not matter, and the engine can override the guessed kind');
});

test('Other is accepted when the model actually chose it', () => {
  assert.equal(classificationFrom('SPORT Other sports', CATEGORIES, 'sport').category.id, 'c9');
});

// The gate. None of these may produce a category: each leaves the request held
// and retried, instead of handing the admin an uncategorised request.
test('an invented, wrong-kind or unreadable answer places nothing', () => {
  for (const reply of ['SPORT Martial arts', 'SPORT Music', '', 'I think this is boxing', 'Combat sports']) {
    assert.equal(classificationFrom(reply, CATEGORIES, 'hobby').category, null, JSON.stringify(reply));
  }
  assert.equal(classificationFrom('', CATEGORIES, 'hobby').kind, 'hobby', 'an unreadable reply keeps the caller kind');
});
