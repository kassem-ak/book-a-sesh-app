import {
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Root } from './src/navigation/Root';
import { useStore } from './src/state/store';

export default function App() {
  const [loaded] = useFonts({
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });
  const isDark = useStore((s) => s.isDark);
  // Render immediately; if the bundled Google Fonts are slow to register,
  // native falls back to the system font and swaps them in when ready.
  // (Do not hard-block on `loaded` — that can hang to a black screen.)
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Root />
    </SafeAreaProvider>
  );
}
