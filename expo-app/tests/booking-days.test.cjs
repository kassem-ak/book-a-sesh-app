// Run: node tests/booking-days.test.cjs
// The picker must agree with create_booking_for_coach, which checks
// coach_availability on `extract(isodow from slot) - 1` (0=Mon..6=Sun). A
// picker that offers a day the server refuses is a booking that fails on
// Confirm, after the user has chosen everything.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load() {
  const filename = join(__dirname, '../src/overlays/BookingOverlay.tsx');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const exports = {};
  const stub = new Proxy({}, { get: () => () => null });
  runInNewContext(code, {
    exports, React: null, Date, Math, String, Number, Array, Intl, console,
    require: (id) => (id === '../state/sampleData'
      ? { slotDefs: ['6:30 AM', '8:00 AM', '5:30 PM'] }
      : id === '../state/store'
        ? { useStore: stub, SCHED_TIMES: ['6:30 AM', '8:00 AM', '5:30 PM', '7:00 PM'], bookingDayLabel: String }
        : stub),
  }, { filename });
  return exports;
}

const picker = load();
// The module runs in a vm realm, so its arrays fail deepStrictEqual against
// ours on prototype identity alone. Round-trip into this realm first.
const bookableDays = (week, now) => JSON.parse(JSON.stringify(picker.bookableDays(week, now)));
// 2026-09-21 is a Monday. isodow 1, so coach_availability.weekday 0.
const MONDAY_NOON = new Date(2026, 8, 21, 12, 0, 0);

test('a Monday-only coach is offered on Mondays and nothing else', () => {
  const days = bookableDays({ 0: ['5:30 PM'] }, MONDAY_NOON);
  assert.ok(days.length >= 4, 'four weeks should contain four Mondays');
  for (const day of days) {
    assert.equal(new Date(`${day.date}T00:00:00`).getDay(), 1, `${day.date} is not a Monday`);
    assert.deepEqual(day.slots, ['5:30 PM']);
  }
});

test('Sunday maps to weekday 6, not 0', () => {
  const days = bookableDays({ 6: ['8:00 AM'] }, MONDAY_NOON);
  assert.ok(days.length > 0);
  for (const day of days) assert.equal(new Date(`${day.date}T00:00:00`).getDay(), 0);
});

test('a coach with no schedule is offered every day at the suggested times', () => {
  const days = bookableDays(null, MONDAY_NOON);
  assert.equal(days.length, 28);
  assert.deepEqual(days[1].slots, ['6:30 AM', '8:00 AM', '5:30 PM']);
});

test("today keeps only slots that have not passed", () => {
  const days = bookableDays(null, MONDAY_NOON);
  assert.equal(days[0].date, '2026-09-21');
  assert.deepEqual(days[0].slots, ['5:30 PM'], 'morning slots are in the past at noon');
});

test('a day whose slots have all passed is dropped, not shown empty', () => {
  const evening = new Date(2026, 8, 21, 23, 30, 0);
  const days = bookableDays({ 0: ['8:00 AM'] }, evening);
  assert.notEqual(days[0].date, '2026-09-21');
});

test('slots come back in time order regardless of row order', () => {
  const days = bookableDays({ 0: ['7:00 PM', '6:30 AM', '5:30 PM'] }, MONDAY_NOON);
  assert.deepEqual(days[0].slots, ['5:30 PM', '7:00 PM'], 'sorted, and the past 6:30 AM dropped');
});

test('a coach with an empty schedule for every day offers nothing', () => {
  assert.deepEqual(bookableDays({}, MONDAY_NOON), []);
});
