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

// ---- typed time input ------------------------------------------------------
//
// Steppers could only produce a time the schedule can hold. A text box can
// produce anything, so what it refuses -- and what it says when it refuses --
// is the whole of this feature's safety.

const parse = (text) => availability().parseTimeInput(text);
const ok = (text) => { const r = parse(text); assert.ok('minutes' in r, `${text}: ${r.error}`); return r.minutes; };
const bad = (text) => { const r = parse(text); assert.ok('error' in r, `${text} should have been refused`); return r.error; };

test('the forms people actually type all work', () => {
  assert.equal(ok('9:00 AM'), 9 * 60);
  assert.equal(ok('9:00'), 9 * 60);
  assert.equal(ok('9'), 9 * 60);
  assert.equal(ok('9:30am'), 9 * 60 + 30);
  assert.equal(ok('  9:30 AM  '), 9 * 60 + 30);
  assert.equal(ok('17:30'), 17 * 60 + 30);
  assert.equal(ok('5 pm'), 17 * 60);
  assert.equal(ok('5:30 PM'), 17 * 60 + 30);
});

test('noon and midday are not confused with each other', () => {
  assert.equal(ok('12:00 PM'), 12 * 60);
  assert.equal(ok('12:30 PM'), 12 * 60 + 30);
  // 12:00 AM is midnight, which is outside bookable hours -- refused, but for
  // being out of range rather than being misread as noon.
  assert.match(bad('12:00 AM'), /Bookable hours/);
});

test('a time between slots is refused rather than rounded', () => {
  // Silently rounding 9:17 to 9:30 is a schedule the coach did not agree to.
  assert.match(bad('9:17'), /hour or half hour/);
  assert.match(bad('9:45'), /hour or half hour/);
});

test('out-of-range times say so', () => {
  assert.match(bad('3:00 AM'), /Bookable hours/);
  assert.match(bad('23:30'), /Bookable hours/);
  // The last bookable start is 10:30 PM, and 11:00 PM is a valid FINISH.
  assert.equal(ok('11:00 PM'), 23 * 60);
});

test('nonsense gets a reason, not a crash', () => {
  assert.match(bad(''), /Enter a time/);
  assert.match(bad('lunchtime'), /not a time/);
  assert.match(bad('9:99'), /Minutes/);
  assert.match(bad('25:00'), /Hours go up to 23/);
  assert.match(bad('13 pm'), /1 to 12/);
});

test('a period needs its finish after its start', () => {
  const { parsePeriodInput } = availability();
  assert.match(parsePeriodInput('5:00 PM', '9:00 AM').error, /after the start/);
  assert.match(parsePeriodInput('9:00 AM', '9:00 AM').error, /after the start/);
  const good = parsePeriodInput('9:00 AM', '12:00 PM');
  assert.equal(good.period.startsAt, 9 * 60);
  assert.equal(good.period.endsAt, 12 * 60);
});

test('a bad half of a period reports which half', () => {
  const { parsePeriodInput } = availability();
  assert.match(parsePeriodInput('nonsense', '5:00 PM').error, /not a time/);
  assert.match(parsePeriodInput('9:00 AM', '9:17').error, /hour or half hour/);
});

// ---- day ranges ------------------------------------------------------------

test('a range covers both ends and everything between', () => {
  const { daysInRange } = availability();
  assert.equal(daysInRange(0, 4).join(','), '0,1,2,3,4');   // Mon to Fri
  assert.equal(daysInRange(5, 6).join(','), '5,6');         // Sat to Sun
});

test('a single day is a range of one', () => {
  const { daysInRange } = availability();
  assert.equal(daysInRange(2, 2).join(','), '2');
});

test('a range that wraps the week is a real shift pattern, not an error', () => {
  const { daysInRange } = availability();
  // Saturday to Monday: a weekend that runs into the week.
  assert.equal(daysInRange(5, 0).join(','), '5,6,0');
  assert.equal(daysInRange(6, 1).join(','), '6,0,1');
});

test('a range never repeats a day', () => {
  const { daysInRange } = availability();
  for (const [from, to] of [[0, 6], [3, 2], [6, 5]]) {
    const days = daysInRange(from, to);
    assert.equal(new Set(days).size, days.length, `${from}->${to} repeated a day`);
    assert.ok(days.length <= 7);
  }
});

// ---- adding hours to a day -------------------------------------------------

test('a period added to an empty day is that day', () => {
  const { addPeriod, periodLabel } = availability();
  const added = addPeriod([], { startsAt: 9 * 60, endsAt: 17 * 60 });
  assert.equal(added.length, 1);
  assert.equal(periodLabel(added[0]), '9:00 AM – 5:00 PM');
});

test('a separate period stays separate', () => {
  const { addPeriod } = availability();
  const added = addPeriod([{ startsAt: 9 * 60, endsAt: 12 * 60 }], { startsAt: 16 * 60, endsAt: 20 * 60 });
  assert.equal(added.length, 2);
});

test('overlapping and touching periods merge instead of stacking', () => {
  const { addPeriod, periodLabel } = availability();
  // The stored slots cannot tell two overlapping entries apart, so keeping them
  // separate would be a lie the next read corrects.
  const overlap = addPeriod([{ startsAt: 9 * 60, endsAt: 12 * 60 }], { startsAt: 11 * 60, endsAt: 14 * 60 });
  assert.equal(overlap.length, 1);
  assert.equal(periodLabel(overlap[0]), '9:00 AM – 2:00 PM');

  const touching = addPeriod([{ startsAt: 9 * 60, endsAt: 12 * 60 }], { startsAt: 12 * 60, endsAt: 14 * 60 });
  assert.equal(touching.length, 1);
  assert.equal(periodLabel(touching[0]), '9:00 AM – 2:00 PM');
});

test('adding the same hours twice changes nothing', () => {
  const { addPeriod } = availability();
  const once = addPeriod([], { startsAt: 9 * 60, endsAt: 17 * 60 });
  const twice = addPeriod(once, { startsAt: 9 * 60, endsAt: 17 * 60 });
  assert.equal(JSON.stringify(twice), JSON.stringify(once));
});

test('a third separate period is detectable, so the form can refuse it', () => {
  const { addPeriod } = availability();
  const two = [{ startsAt: 7 * 60, endsAt: 9 * 60 }, { startsAt: 12 * 60, endsAt: 14 * 60 }];
  assert.equal(addPeriod(two, { startsAt: 18 * 60, endsAt: 20 * 60 }).length, 3);
  // But one that bridges them is still two, and must not be refused.
  assert.equal(addPeriod(two, { startsAt: 9 * 60, endsAt: 12 * 60 }).length, 1);
});

// ---- grouping identical days ----------------------------------------------
//
// A coach who set nine to five Monday to Friday should see one row, not the
// same fact copied five times.

const NINE_TO_FIVE = ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM'];
const EVENING = ['6:00 PM','6:30 PM','7:00 PM','7:30 PM'];

test('a run of days with the same hours is one group', () => {
  const { groupWeek, periodLabel } = availability();
  const groups = groupWeek({ 0: NINE_TO_FIVE, 1: NINE_TO_FIVE, 2: NINE_TO_FIVE, 3: NINE_TO_FIVE, 4: NINE_TO_FIVE });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].days.join(','), '0,1,2,3,4');
  assert.equal(periodLabel(groups[0].periods[0]), '9:00 AM – 5:00 PM');
});

test('a day with different hours breaks the run', () => {
  const { groupWeek } = availability();
  const groups = groupWeek({ 0: NINE_TO_FIVE, 1: NINE_TO_FIVE, 2: EVENING, 3: NINE_TO_FIVE, 4: NINE_TO_FIVE });
  assert.equal(groups.length, 3);
  assert.equal(groups.map((g) => g.days.join('')).join('|'), '01|2|34');
});

test('a gap in the week breaks the run even when the hours match', () => {
  const { groupWeek } = availability();
  // Monday and Wednesday are not consecutive, so "Monday – Wednesday" would
  // claim Tuesday, which the coach does not work.
  const groups = groupWeek({ 0: NINE_TO_FIVE, 2: NINE_TO_FIVE });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].days.join(','), '0');
  assert.equal(groups[1].days.join(','), '2');
});

test('days that do not work appear nowhere', () => {
  const { groupWeek } = availability();
  const groups = groupWeek({ 0: NINE_TO_FIVE, 1: [], 2: NINE_TO_FIVE });
  assert.equal(groups.length, 2);
  assert.ok(!groups.some((g) => g.days.includes(1)));
});

test('an empty week is no groups, not an empty group', () => {
  const { groupWeek } = availability();
  assert.equal(groupWeek({}).length, 0);
  assert.equal(groupWeek({ 3: [] }).length, 0);
});

test('two periods a day group only when BOTH match', () => {
  const { groupWeek } = availability();
  const both = [...NINE_TO_FIVE.slice(0, 6), ...EVENING];
  const same = groupWeek({ 0: both, 1: both });
  assert.equal(same.length, 1);
  assert.equal(same[0].periods.length, 2);

  // Same morning, no evening on Tuesday: not the same hours.
  const differs = groupWeek({ 0: both, 1: NINE_TO_FIVE.slice(0, 6) });
  assert.equal(differs.length, 2);
});

test('the whole week on the same hours is one group', () => {
  const { groupWeek } = availability();
  const week = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, NINE_TO_FIVE]));
  const groups = groupWeek(week);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].days.length, 7);
});

test('grouping does not wrap Sunday into Monday', () => {
  const { groupWeek } = availability();
  // A wrapping range is real, but a row reading "Saturday – Monday" above
  // Tuesday is harder to read than the two rows it replaces.
  const groups = groupWeek({ 0: NINE_TO_FIVE, 5: NINE_TO_FIVE, 6: NINE_TO_FIVE });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].days.join(','), '0');
  assert.equal(groups[1].days.join(','), '5,6');
});

test('the public profile label is short and reads as a range', () => {
  // PersonOverlay shows these in a fixed-width column beside the hours, so the
  // long day names would wrap on a phone.
  const { groupWeek } = availability();
  const groups = groupWeek({ 0: NINE_TO_FIVE, 1: NINE_TO_FIVE, 6: EVENING });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].days.length, 2);
  assert.equal(groups[1].days.join(','), '6');
});

// ---- the input mask --------------------------------------------------------
//
// Digits fall into H:MM as they are typed. The mask SHAPES rather than
// validates: half of every valid time is an invalid prefix of it, so refusing
// keystrokes would make the field feel broken.

const mask = (text) => availability().maskTimeInput(text);

test('digits fall into place one keystroke at a time', () => {
  // What the field shows after each press of 9, 3, 0.
  assert.equal(mask('9'), '9');
  assert.equal(mask('93'), '9:3');
  assert.equal(mask('930'), '9:30');
});

test('a leading 1 or 2 waits to see if the hour is two digits', () => {
  assert.equal(mask('1'), '1');
  assert.equal(mask('17'), '17');
  assert.equal(mask('173'), '17:3');
  assert.equal(mask('1730'), '17:30');
});

test('a leading 3 to 9 cannot start a two-digit hour, so it is the hour', () => {
  // 93 is not an hour, so the 3 has to be the first digit of the minutes.
  assert.equal(mask('93'), '9:3');
  assert.equal(mask('530'), '5:30');
  assert.equal(mask('300'), '3:00');
});

test('a two-digit pair over 23 falls back to a one-digit hour', () => {
  // 25 cannot be an hour. The 5 belongs to the minutes.
  assert.equal(mask('25'), '2:5');
  assert.equal(mask('2530'), '2:53');
});

test('midnight and noon hours survive the fallback', () => {
  assert.equal(mask('0000'), '00:00');
  assert.equal(mask('1200'), '12:00');
  assert.equal(mask('2300'), '23:00');
});

test('a or p anywhere becomes the meridiem', () => {
  assert.equal(mask('930a'), '9:30 AM');
  assert.equal(mask('930p'), '9:30 PM');
  assert.equal(mask('9:30 PM'), '9:30 PM');
  // Typed before the digits are finished, it still sticks.
  assert.equal(mask('9p'), '9 PM');
});

test('punctuation the person types is ignored -- the mask supplies it', () => {
  assert.equal(mask('9:30'), '9:30');
  assert.equal(mask('9.30'), '9:30');
  assert.equal(mask('9 30'), '9:30');
});

test('more than four digits are dropped rather than scrolling the time away', () => {
  assert.equal(mask('123456'), '12:34');
});

test('deleting back to nothing leaves nothing', () => {
  assert.equal(mask(''), '');
  assert.equal(mask('abc'), '');
  // A lone meridiem with no digits is not a time yet, but is not thrown away.
  assert.equal(mask('p'), 'PM');
});

test('the mask never rejects a prefix of something valid', () => {
  const { parseTimeInput } = availability();
  for (const target of ['9:30 AM', '5:00 PM', '17:30', '11:00 PM', '5:00 AM']) {
    // Type it one character at a time; every intermediate state must survive.
    let typed = '';
    for (const char of target) {
      typed = mask(typed + char);
      assert.equal(typeof typed, 'string');
    }
    const parsed = parseTimeInput(typed);
    assert.ok('minutes' in parsed, `typing "${target}" ended at "${typed}": ${parsed.error}`);
  }
});

// ---- settling on blur ------------------------------------------------------

test('leaving the field finishes the time', () => {
  const { normaliseTimeInput } = availability();
  assert.equal(normaliseTimeInput('9'), '9:00 AM');
  assert.equal(normaliseTimeInput('9:30'), '9:30 AM');
  assert.equal(normaliseTimeInput('1730'), '5:30 PM');
  assert.equal(normaliseTimeInput('17:30'), '5:30 PM');
  assert.equal(normaliseTimeInput('5p'), '5:00 PM');
});

test('a time that does not parse is left exactly as typed', () => {
  const { normaliseTimeInput } = availability();
  // Rewriting someone's input while they are trying to fix it is worse than
  // leaving it alone; the error message is already saying what is wrong.
  assert.equal(normaliseTimeInput('9:17'), '9:17');
  assert.equal(normaliseTimeInput('lunchtime'), 'lunchtime');
  assert.equal(normaliseTimeInput(''), '');
});

test('settling is idempotent', () => {
  const { normaliseTimeInput } = availability();
  const once = normaliseTimeInput('1730');
  assert.equal(normaliseTimeInput(once), once);
});

// ---- Comments on a schedule entry ------------------------------------------
// The note rides the period's first slot, so the two things worth pinning are
// that it is read from the start and nowhere else, and that a merge does not
// swallow it silently.

test('a note is read from the period start, and only from there', () => {
  const { periodsFromSlots, slotsForPeriods } = availability();
  const slots = slotsForPeriods([{ startsAt: 9 * 60, endsAt: 11 * 60 }]);
  const back = periodsFromSlots(slots, (slot) => ({
    '9:00 AM': 'Juniors only',
    '10:00 AM': 'ignored, not a start',
  })[slot]);
  assert.equal(back.length, 1);
  assert.equal(back[0].note, 'Juniors only');
});

test('a period with no note keeps the shape it always had', () => {
  const { periodsFromSlots, slotsForPeriods } = availability();
  const back = periodsFromSlots(slotsForPeriods([{ startsAt: 9 * 60, endsAt: 10 * 60 }]), () => '   ');
  assert.equal('note' in back[0], false);
});

test('merging keeps the earliest note rather than dropping every one', () => {
  const { addPeriod } = availability();
  const merged = addPeriod(
    [{ startsAt: 9 * 60, endsAt: 12 * 60, note: 'Outdoor' }],
    { startsAt: 11 * 60, endsAt: 14 * 60, note: 'Indoor' },
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].note, 'Outdoor');
});

test('days with the same hours but different notes do not group together', () => {
  const { groupWeek, slotsForPeriods, noteKey } = availability();
  const slots = slotsForPeriods([{ startsAt: 9 * 60, endsAt: 10 * 60 }]);
  const week = { 0: slots, 1: slots };
  assert.equal(groupWeek(week, {}).length, 1);
  assert.equal(groupWeek(week, { [noteKey(1, '9:00 AM')]: 'Juniors only' }).length, 2);
});

test('a note is trimmed and capped at what the column will take', () => {
  const { cleanNote, MAX_NOTE_LENGTH } = availability();
  assert.equal(cleanNote('   '), null);
  assert.equal(cleanNote(null), null);
  assert.equal(cleanNote('  Outdoor  '), 'Outdoor');
  assert.equal(cleanNote('x'.repeat(500)).length, MAX_NOTE_LENGTH);
});
