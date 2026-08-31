import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthForm } from '../overlays/AuthOverlay';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

// Landing gate: shown before the app when there is no signed-in account and
// the user has not chosen guest mode. Sign-in/up or SSO drops straight into
// the app; "Continue as guest" keeps the anonymous demo session.
export function AuthLanding() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStore();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 46,
          paddingBottom: insets.bottom + 26,
          paddingHorizontal: 22,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* brand */}
        <View style={{ alignItems: 'center', marginBottom: 34 }}>
          <View style={{ width: 84, height: 60, borderRadius: 20, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[t.pageTitle, { fontSize: 34, color: c.ink }]}>S</Text>
          </View>
          <Text style={[t.pageTitle, { color: c.txt, marginTop: 18 }]}>Spotter</Text>
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 6, textAlign: 'center' }]}>
            Find your coach or training partner in Beirut.
          </Text>
        </View>

        <AuthForm onDone={() => s.set('guestMode', true)} />

        <Pressable onPress={() => s.set('guestMode', true)} style={{ marginTop: 26, alignItems: 'center' }}>
          <Text style={[t.label, { color: c.txt2 }]}>Continue as guest →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
