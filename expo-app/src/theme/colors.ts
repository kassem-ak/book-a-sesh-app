// Semantic color model ported from the prototype's CSS :root (dark) and
// [data-theme="light"] variable sets. Names mirror the design tokens.

export interface Colors {
  isDark: boolean;
  bg: string;
  nav: string;
  surface: string;
  surface2: string;
  line: string;
  line2: string;
  txt: string;
  strong: string;
  soft: string;
  txt2: string;
  txt3: string;
  mono: string;
  mapBg: string;
  grid: string;
  accent: string; // text/link/price accent — darkens in light theme
  volt: string; // brand volt — constant across themes
  amber: string;
  amberText: string;
  danger: string;
  avatarBg: string;
  ink: string; // button-on-volt text — constant
  ph: string; // `--ph` — image placeholder fill
  cyan: string; // second onboarding gradient blob
  scrim: string; // sheet/modal backdrop
}

export const dark: Colors = {
  isDark: true,
  bg: '#0D0E11',
  nav: '#101216',
  surface: '#16181D',
  surface2: '#1C1F26',
  line: 'rgba(255,255,255,0.07)',
  line2: 'rgba(255,255,255,0.05)',
  txt: '#F2F3F5',
  strong: '#E7E9EC',
  soft: '#C5CAD2',
  txt2: '#9BA1AC',
  txt3: '#6B7280',
  mono: '#3A3F47',
  mapBg: '#0A0B0D',
  grid: 'rgba(255,255,255,0.035)',
  accent: '#C6F24E',
  volt: '#C6F24E',
  amber: '#F2C84B',
  amberText: '#F2C84B',
  danger: '#E8543F',
  avatarBg: '#262B33',
  ink: '#0D0E11',
  ph: 'rgba(255,255,255,0.04)',
  cyan: '#4EBEF2',
  scrim: 'rgba(0,0,0,0.55)',
};

export const light: Colors = {
  isDark: false,
  bg: '#F4F5F7',
  nav: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#EBEDF1',
  line: 'rgba(0,0,0,0.09)',
  line2: 'rgba(0,0,0,0.06)',
  txt: '#15171C',
  strong: '#22252B',
  soft: '#3F454D',
  txt2: '#5A616B',
  txt3: '#8A909A',
  mono: '#AEB4BE',
  mapBg: '#E6E8ED',
  grid: 'rgba(0,0,0,0.05)',
  accent: '#5E7B10',
  volt: '#B4E13A',
  amber: '#F2C84B',
  amberText: '#9A7400',
  danger: '#E8543F',
  avatarBg: '#565E6B',
  ink: '#0D0E11',
  ph: 'rgba(0,0,0,0.05)',
  cyan: '#2E9BD1',
  scrim: 'rgba(0,0,0,0.55)',
};

// Alpha helper for tints (volt/amber/danger backgrounds).
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
