import { Expense, HistoryEntry } from './models';

// Static taxonomy and calendar options. Entity lists start empty and come
// from the server; development fixtures never become production fallbacks.

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

// Accounting has no connected ledger yet.
export const revenue = 0;
export const marginDefs: [string, string][] = [
  ['session', 'Coach session commission'],
  ['shop', 'Shop sale commission'],
  ['boost', 'Boost fee margin'],
];
export const shareDefs: [string, string][] = [];
export const allAdmins: string[] = [];

export const initialExpenses: Expense[] = [];
export const initialHistory: HistoryEntry[] = [];
export const recurHints: Record<string, string> = {
  'One-time': 'Logged once in the current month only.',
  Weekly: 'Automatically re-added every week.',
  Monthly: 'Automatically re-added every month.',
  Yearly: 'Automatically re-added every year.',
};
export const recurOptions = ['One-time', 'Weekly', 'Monthly', 'Yearly'];
