import { useStore } from '../state/store';
import { dark, light } from './colors';
import { type as typeScale } from './typography';

// ---- Shape tokens (handoff v2 "Shape & spacing") ----
export const radii = {
  card: 20,
  input: 16, // inputs & filter rows
  button: 15, // primary CTA
  avatar: 17, // avatar tiles
  sheet: 24, // bottom-sheet top corners
  pill: 999, // chips & segmented
} as const;

// ---- Avatar tile sizes (handoff v2) ----
export const avatarSize = {
  list: 58,
  storeHero: 64,
  venue: 66,
} as const;

// ---- Spacing ----
export const spacing = {
  screen: 18,
  card: 15,
  listGap: 12,
} as const;

// ---- Motion durations (board annotations) ----
export const motion = {
  overlay: 280, // slide up 14px + fade
  sheet: 250, // bottom sheet slide up + scrim fade
  fab: 250, // scroll-aware FAB: translateY 28 + fade
  toggle: 180, // toggles / tabs 150-200ms
  fabTravel: 28,
  overlayTravel: 14,
} as const;

export function useTheme() {
  const isDark = useStore((s) => s.isDark);
  return { c: isDark ? dark : light, t: typeScale, isDark };
}

export { dark, light, alpha } from './colors';
export type { Colors } from './colors';
export { type, fonts } from './typography';
