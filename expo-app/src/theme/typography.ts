import { TextStyle } from 'react-native';

// Font family names as exported by @expo-google-fonts (loaded in App.tsx).
export const fonts = {
  archivo500: 'Archivo_500Medium',
  archivo600: 'Archivo_600SemiBold',
  archivo700: 'Archivo_700Bold',
  archivo800: 'Archivo_800ExtraBold',
  archivo900: 'Archivo_900Black',
  hanken400: 'HankenGrotesk_400Regular',
  hanken500: 'HankenGrotesk_500Medium',
  hanken600: 'HankenGrotesk_600SemiBold',
  hanken700: 'HankenGrotesk_700Bold',
  hanken800: 'HankenGrotesk_800ExtraBold',
};

// Named text styles matching the handoff typography spec.
export const type = {
  pageTitle: { fontFamily: fonts.archivo800, fontSize: 27, lineHeight: 30, letterSpacing: -0.5 },
  overlayTitle: { fontFamily: fonts.archivo800, fontSize: 19 },
  price: { fontFamily: fonts.archivo800, fontSize: 17 },
  priceSm: { fontFamily: fonts.archivo800, fontSize: 15 },
  sectionHeading: { fontFamily: fonts.archivo800, fontSize: 12, letterSpacing: 1.4 },
  initials: { fontFamily: fonts.archivo800, fontSize: 18 },
  bodyLg: { fontFamily: fonts.hanken400, fontSize: 15 },
  body: { fontFamily: fonts.hanken400, fontSize: 14 },
  bodySm: { fontFamily: fonts.hanken400, fontSize: 13 },
  name: { fontFamily: fonts.hanken700, fontSize: 16 },
  label: { fontFamily: fonts.hanken700, fontSize: 14 },
  labelSm: { fontFamily: fonts.hanken700, fontSize: 13 },
  microBadge: { fontFamily: fonts.archivo800, fontSize: 9, letterSpacing: 0.7 },
  navLabel: { fontFamily: fonts.hanken600, fontSize: 10 },
  caption: { fontFamily: fonts.hanken400, fontSize: 11 },
} satisfies Record<string, TextStyle>;

export type TypeScale = typeof type;
