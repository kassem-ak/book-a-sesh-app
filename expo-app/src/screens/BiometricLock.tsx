import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark, Button, VoltButton } from '../components/ui';
import { biometricLabel, unlockWithBiometrics } from '../lib/biometric';
import { signOutUser } from '../lib/session';
import { useTheme } from '../theme';

// The lock in front of a session that is already on this device.
//
// It asks as soon as it appears -- the person opened the app to use it, and a
// screen that waits for a tap before asking is a tap for nothing. If they
// cancel, it stays and offers the prompt again.
//
// "Sign in another way" signs out. That is the way past a face the phone no
// longer recognises, and it is not a bypass: getting back in needs the password
// or the provider sign-in, which is exactly what the lock stands in for.

export function BiometricLock({ onUnlocked }: { onUnlocked: () => void }) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('biometrics');
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);

  const ask = useCallback(async () => {
    setAsking(true);
    setFailed(false);
    const ok = await unlockWithBiometrics();
    setAsking(false);
    if (ok) onUnlocked();
    else setFailed(true);
  }, [onUnlocked]);

  useEffect(() => {
    void biometricLabel().then(setLabel);
    void ask();
  }, [ask]);

  return (
    <View style={{
      flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center',
      padding: 28, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28, gap: 14,
    }}>
      <BrandMark size={44} />
      <Text accessibilityRole="header" style={[t.overlayTitle, { color: c.txt, textAlign: 'center', marginTop: 6 }]}>
        BOOK’D is locked
      </Text>
      <Text style={[t.bodySm, { color: c.txt2, textAlign: 'center' }]}>
        {failed
          ? `That did not unlock it. Try ${label} again, or sign in another way.`
          : `Use ${label} to open your account.`}
      </Text>
      <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 10 }}>
        <VoltButton
          icon="unlock"
          label={`Unlock with ${label}`}
          busy={asking}
          busyLabel="Waiting…"
          onPress={() => void ask()}
        />
        <Button label="Sign in another way" icon="log-out" full onPress={() => void signOutUser()} />
      </View>
    </View>
  );
}
