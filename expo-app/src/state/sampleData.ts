import { AdDef, Expense, HistoryEntry } from './models';

// Static, non-entity data: taxonomy labels, booking-calendar arithmetic and the
// ad definitions. The invented coaches, training partners, shops, communities,
// sub-groups, members, events, chats and reviews that used to live here were
// deleted for the public release: a fallback row is a person who does not exist,
// and the user could tap through and pay for a session with them. Selectors now
// return exactly what the server returned.

export const sportNames = ['All', 'Strength', 'Boxing', 'Running', 'Climbing', 'Yoga', 'Calisthenics', 'Music', 'Chess'];

export const shopCategories = ['Running', 'Strength', 'Boxing', 'Yoga', 'Cycling', 'Tennis', 'Other'];

// booking calendar: the bookable month is the next calendar month, so every
// offered slot is genuinely in the future.
const bookingMonthDate = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
})();
export const bookingYear = bookingMonthDate.getFullYear();
export const bookingMonthNumber = bookingMonthDate.getMonth() + 1;
export const bookingMonthName = bookingMonthDate.toLocaleString('en-US', { month: 'long' });
export const monthLabel = bookingMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
export const firstDow = bookingMonthDate.getDay();
export const daysInMonth = new Date(bookingYear, bookingMonthNumber, 0).getDate();
// The whole bookable month is in the future, so no day of it is past.
export const todayNum = 0;
export const slotDefs = ['6:30 AM', '8:00 AM', '12:00 PM', '5:30 PM', '6:30 PM', '7:30 PM'];

// accounting (admin-only surface, still seeded locally - see report)
export const revenue = 12480;
export const marginDefs: [string, string][] = [
  ['session', 'Coach session commission'],
  ['shop', 'Shop sale commission'],
  ['boost', 'Boost fee margin'],
];
export const shareDefs: [string, string][] = [
  ['alex', 'Alex Morgan (you)'],
  ['rima', 'Rima Haddad'],
  ['karim', 'Karim Saleh'],
];
export const allAdmins = ['Alex Morgan (you)', 'Rima Haddad', 'Karim Saleh'];

export const initialExpenses: Expense[] = [
  { id: 'e1', label: 'Servers & infrastructure', amt: 1240, recur: 'Monthly' },
  { id: 'e2', label: 'Payment processing', amt: 610, recur: 'Monthly' },
  { id: 'e3', label: 'Marketing & ads', amt: 980, recur: 'Monthly' },
  { id: 'e4', label: 'Support & moderation', amt: 450, recur: 'Monthly' },
];
export const initialHistory: HistoryEntry[] = [
  { whenLabel: 'Jun 28', title: 'Expense updated', detail: 'Marketing & ads: $860 → $980 (Monthly)', meta: 'By Rima Haddad' },
  { whenLabel: 'Jun 12', title: 'Margins updated', detail: 'Coach session commission: 15% → 12%', meta: 'Approved by 3 admins · affected coaches notified' },
  { whenLabel: 'May 30', title: 'Payout distributed', detail: 'May net profit $8,540 split 40 / 30 / 30', meta: 'Automatic' },
];
export const recurHints: Record<string, string> = {
  'One-time': 'Logged once in the current month only.',
  Weekly: 'Automatically re-added every week.',
  Monthly: 'Automatically re-added every month.',
  Yearly: 'Automatically re-added every year.',
};
export const recurOptions = ['One-time', 'Weekly', 'Monthly', 'Yearly'];

export const ads: Record<string, AdDef> = {
  discover: { key: 'discover', brand: 'StrideLab', logo: 'SL', tint: '#2A3A2E', headline: 'Marathon-ready running shoes, tested on Beirut roads', body: 'Free gait analysis with every first pair at our Hamra store.', cta: 'Shop now', why: 'Based on your hobbies: Running · your goal "Run a marathon"' },
  community: { key: 'community', brand: 'FuelUp Nutrition', logo: 'FN', tint: '#3A322A', headline: '20% off recovery packs for training crews', body: 'Group orders for communities — delivered across Lebanon.', cta: 'Get offer', why: 'Based on your communities: Running, Strength' },
};
