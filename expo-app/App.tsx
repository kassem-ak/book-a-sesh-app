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
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Root } from './src/navigation/Root';
import { useStore } from './src/state/store';
import { dark, light } from './src/theme/colors';

export default function App() {
  const [loaded, fontError] = useFonts({
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
  const bg = (isDark ? dark : light).bg;

  // Wait for the Google Fonts before the first layout. On the New
  // Architecture, Android measures text with whatever font is registered at
  // measure time and caches that width; painting the real (wider) face
  // afterwards clips the last character off short labels. The wait is
  // bounded so a font failure degrades to the system face instead of
  // hanging on a blank screen.
  const [fontWaitOver, setFontWaitOver] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setFontWaitOver(true), 3000);
    return () => clearTimeout(id);
  }, []);
  const ready = loaded || Boolean(fontError) || fontWaitOver;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {ready ? <Root /> : <View style={{ flex: 1, backgroundColor: bg }} />}
    </SafeAreaProvider>
  );
}
