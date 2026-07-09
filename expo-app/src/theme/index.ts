import { useStore } from '../state/store';
import { dark, light } from './colors';
import { type as typeScale } from './typography';

export function useTheme() {
  const isDark = useStore((s) => s.isDark);
  return { c: isDark ? dark : light, t: typeScale, isDark };
}

export { dark, light, alpha } from './colors';
export type { Colors } from './colors';
export { type, fonts } from './typography';
