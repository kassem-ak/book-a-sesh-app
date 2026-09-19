// Run: node tests/availability.test.cjs
// Days off, and the day list they filter. The RPC refuses a closed date on the
// server -- these pin the two things the client must get right: not offering a
// day that would be refused, and never turning a local evening into tomorrow.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load(file, deps, globals = {}) {
  const filename = join(__dirname, `../src/${file}`);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (id) => {
      if (id in deps) return deps[id];
      return new Proxy({}, { get: () => () => null });
    },
    Array, Object, JSON, Number, Math, String, Date, Map, Set, URL, Promise,
    ...globals,
  }, { filename });
  return exports;
}

// dateKey is re-exported from calendarGrid, so it has to be the real one --
// the catch-all stub below would otherwise return null and hide the bug this
// very test exists to catch.
const calendarGrid = () => load('lib/calendarGrid.ts', {});
const availability = () => load('lib/availability.ts', { './calendarGrid': calendarGrid() });

const booking = () => load('overlays/BookingOverlay.tsx', {
  '../state/store': {
    SCHED_TIMES: ['6:30 AM', '9:00 AM', '12:00 PM', '6:30 PM', '8:00 PM'],
    useStore: () => ({}),
    bookingDayLabel: () => '',
  },
  '../state/sampleData': { slotDefs: ['6:30 AM', '9:00 AM', '6:30 PM'] },
});

// ---- date keys -------------------------------------------------------------

test('a date key is the LOCAL day, not a UTC one', () => {
  const { dateKey } = availability();
  // 11pm on the 4th. toISOString().slice(0,10) files this as the 5th anywhere
  // east of UTC -- and a coach closing "the 4th" would be open on it.
  assert.equal(dateKey(new Date(2026, 9, 4, 23, 30)), '2026-10-04');
  assert.equal(dateKey(new Date(2026, 9, 5, 0, 15)), '2026-10-05');
});

test('single-digit months and days are padded', () => {
  const { dateKey } = availability();
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('a closed date reads back as a human date, and rubbish does not throw', () => {
  const { blackoutLabel } = availability();
  assert.match(blackoutLabel('2026-10-04'), /Oct/);
  assert.equal(blackoutLabel('not-a-date'), 'not-a-date');
});

// ---- the day list ----------------------------------------------------------

const MONDAY = new Date(2026, 8, 21, 6, 0);   // 21 Sep 2026 is a Monday
const everyDay = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, ['6:30 PM']]));

test('a closed date is not offered at all', () => {
  const { bookableDays } = booking();
  const open = bookableDays(everyDay, MONDAY);
  const closed = bookableDays(everyDay, MONDAY, ['2026-09-23']);
  assert.equal(open.length - closed.length, 1);
  assert.ok(open.some((d) => d.date === '2026-09-23'));
  assert.ok(!closed.some((d) => d.date === '2026-09-23'), 'the closed day must be gone');
});

test('closing several dates removes exactly those', () => {
  const { bookableDays } = booking();
  const days = bookableDays(everyDay, MONDAY, ['2026-09-22', '2026-09-24']);
  assert.ok(!days.some((d) => d.date === '2026-09-22'));
  assert.ok(!days.some((d) => d.date === '2026-09-24'));
  assert.ok(days.some((d) => d.date === '2026-09-23'), 'the day between stays open');
});

test('a date the coach never worked anyway changes nothing', () => {
  const { bookableDays } = booking();
  const mondaysOnly = { 0: ['6:30 PM'] };
  const before = bookableDays(mondaysOnly, MONDAY).length;
  // A Wednesday, which this coach does not work.
  const after = bookableDays(mondaysOnly, MONDAY, ['2026-09-23']).length;
  assert.equal(before, after);
});

test('no days off is the same list as before the feature existed', () => {
  const { bookableDays } = booking();
  assert.equal(bookableDays(everyDay, MONDAY).length, bookableDays(everyDay, MONDAY, []).length);
});

test('a coach with no schedule is still bookable, minus their days off', () => {
  const { bookableDays } = booking();
  // A null week means "not set", which the RPC treats as open. Days off must
  // still apply, or closing a date would do nothing for exactly the coaches
  // most likely to be new.
  const open = bookableDays(null, MONDAY);
  const closed = bookableDays(null, MONDAY, ['2026-09-23']);
  assert.ok(open.length > 0);
  assert.equal(open.length - closed.length, 1);
});

// ---- working hours as ranges ----------------------------------------------
//
// The editor works in ranges; coach_availability stores half-hour slots. This
// conversion is the whole feature: get it wrong and a coach offers hours they
// did not agree to, or loses hours they did.

test('a range becomes the start times inside it, end exclusive', () => {
  const { slotsInPeriod } = availability();
  // 9:00 to 11:00 offers 9:00, 9:30, 10:00, 10:30 -- not 11:00, which is when
  // the last session ends.
  assert.equal(
    slotsInPeriod({ startsAt: 9 * 60, endsAt: 11 * 60 }).join(','),
    '9:00 AM,9:30 AM,10:00 AM,10:30 AM',
  );
});

test('an hour is two slots, and the shortest possible period is one', () => {
  const { slotsInPeriod } = availability();
  assert.equal(slotsInPeriod({ startsAt: 9 * 60, endsAt: 10 * 60 }).length, 2);
  assert.equal(slotsInPeriod({ startsAt: 9 * 60, endsAt: 9 * 60 + 30 }).join(','), '9:00 AM');
});

test('labels round-trip through minutes, including noon and midnight', () => {
  const { minutesFromLabel, labelFromMinutes } = availability();
  for (const label of ['5:00 AM', '9:30 AM', '11:59 AM', '12:00 PM', '12:30 PM', '1:00 PM', '10:30 PM']) {
    assert.equal(labelFromMinutes(minutesFromLabel(label)), label, label);
  }
  // 12 AM and 12 PM are the two that catch a naive %12.
  assert.equal(minutesFromLabel('12:00 AM'), 0);
  assert.equal(minutesFromLabel('12:00 PM'), 720);
});

test('a label that is not a time is rejected rather than becoming midnight', () => {
  const { minutesFromLabel } = availability();
  assert.equal(minutesFromLabel('lunchtime'), null);
  assert.equal(minutesFromLabel('9:00'), null);
  assert.equal(minutesFromLabel('9:70 AM'), null);
  assert.equal(minutesFromLabel(''), null);
});

test('stored slots read back as the range they came from', () => {
  const { periodsFromSlots, periodLabel } = availability();
  const periods = periodsFromSlots(['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM']);
  assert.equal(periods.length, 1);
  assert.equal(periodLabel(periods[0]), '9:00 AM – 11:00 AM');
});

test('a gap in the slots is what makes two periods', () => {
  const { periodsFromSlots, periodLabel } = availability();
  // A morning and an evening, which is the whole reason two periods exist.
  const periods = periodsFromSlots([
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  ]);
  assert.equal(periods.length, 2);
  assert.equal(periodLabel(periods[0]), '9:00 AM – 12:00 PM');
  assert.equal(periodLabel(periods[1]), '4:00 PM – 8:00 PM');
});

test('slots out of order, duplicated, or unparseable still read correctly', () => {
  const { periodsFromSlots, periodLabel } = availability();
  const periods = periodsFromSlots(['10:00 AM', '9:00 AM', '9:30 AM', '9:30 AM', 'whenever']);
  assert.equal(periods.length, 1);
  assert.equal(periodLabel(periods[0]), '9:00 AM – 10:30 AM');
});

test('a schedule with more than two runs keeps them all', () => {
  const { periodsFromSlots } = availability();
  // Set before this editor existed. Showing a coach fewer hours than they
  // actually offer would be worse than showing a third period the editor
  // cannot add.
  assert.equal(periodsFromSlots(['6:00 AM', '9:00 AM', '1:00 PM']).length, 3);
});

test('ranges and slots round-trip', () => {
  const { periodsFromSlots, slotsForPeriods } = availability();
  const original = [
    { startsAt: 9 * 60, endsAt: 12 * 60 },
    { startsAt: 16 * 60, endsAt: 20 * 60 },
  ];
  const back = periodsFromSlots(slotsForPeriods(original));
  assert.equal(JSON.stringify(back), JSON.stringify(original));
});

test('two periods that touch collapse into one, because they are one', () => {
  const { periodsFromSlots, slotsForPeriods, periodLabel } = availability();
  const touching = [
    { startsAt: 9 * 60, endsAt: 12 * 60 },
    { startsAt: 12 * 60, endsAt: 14 * 60 },
  ];
  const back = periodsFromSlots(slotsForPeriods(touching));
  assert.equal(back.length, 1);
  assert.equal(periodLabel(back[0]), '9:00 AM – 2:00 PM');
});

test('overlapping periods do not double up the slots', () => {
  const { slotsForPeriods } = availability();
  const slots = slotsForPeriods([
    { startsAt: 9 * 60, endsAt: 11 * 60 },
    { startsAt: 10 * 60, endsAt: 12 * 60 },
  ]);
  assert.equal(new Set(slots).size, slots.length, 'no duplicate rows may be written');
  assert.equal(slots.length, 6);
});

test('a suggested period is one hour, and the second starts after the first', () => {
  const { suggestedPeriod } = availability();
  const first = suggestedPeriod([]);
  assert.equal(first.endsAt - first.startsAt, 60);
  const second = suggestedPeriod([first]);
  assert.ok(second.startsAt >= first.endsAt, 'the second period must not start inside the first');
  assert.equal(second.endsAt - second.startsAt, 60);
});

test('a suggested period never runs past the end of the day', () => {
  const { suggestedPeriod, DAY_ENDS_AT } = availability();
  const late = suggestedPeriod([{ startsAt: 21 * 60, endsAt: 23 * 60 }]);
  assert.ok(late.endsAt <= DAY_ENDS_AT, `${late.endsAt} must not exceed ${DAY_ENDS_AT}`);
});
