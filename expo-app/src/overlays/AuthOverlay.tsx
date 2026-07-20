import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Field, Icon, SectionHeading, VoltButton } from '../components/ui';
import { signInEmail, signUpEmail } from '../lib/session';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

// Email/password auth. Sign-in and sign-up share the overlay; guests can keep
// browsing without an account (anonymous demo session remains the fallback).
export function AuthOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const canSubmit =
    !busy &&
    email.trim().includes('@') &&
    password.length >= 6 &&
    (mode === 'in' || name.trim().length > 1);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'in') {
        await signInEmail(email.trim(), password);
        s.closeOverlay();
      } else {
        const needsConfirm = await signUpEmail(name.trim(), email.trim(), password);
        if (needsConfirm) setConfirmSent(true);
        else s.closeOverlay();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Check your email" onBack={s.closeOverlay} />}>
        <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 70 }}>
          <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mail" size={32} color={c.ink} />
          </View>
          <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>Confirm your email</Text>
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>
            We sent a confirmation link to {email.trim()}. Open it, then sign in here.
          </Text>
        </View>
      </OverlayScaffold>
    );
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title={mode === 'in' ? 'Sign in' : 'Create account'} onBack={s.closeOverlay} />}
      bottomBar={
        <View style={{ padding: 16, backgroundColor: c.bg }}>
          <VoltButton
            label={busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
            enabled={canSubmit}
            onPress={submit}
          />
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        {mode === 'up' && (
          <>
            <SectionHeading style={{ marginBottom: 11 }}>Name</SectionHeading>
            <Field value={name} onChange={setName} placeholder="Your name" />
            <View style={{ height: 20 }} />
          </>
        )}
        <SectionHeading style={{ marginBottom: 11 }}>Email</SectionHeading>
        <Field value={email} onChange={setEmail} placeholder="you@email.com" keyboardType="email-address" />
        <View style={{ height: 20 }} />
        <SectionHeading style={{ marginBottom: 11 }}>Password</SectionHeading>
        <Field value={password} onChange={setPassword} placeholder="6+ characters" secure />

        {error && <Text style={[t.bodySm, { color: c.danger, marginTop: 14 }]}>{error}</Text>}

        <Pressable
          onPress={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError(null);
          }}
          style={{ marginTop: 22 }}
        >
          <Text style={[t.label, { color: c.accent }]}>
            {mode === 'in' ? "New here? Create an account" : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
        <Text style={[t.bodySm, { color: c.txt3, marginTop: 14 }]}>
          You can keep browsing as a guest — an account saves your bookings, communities and shop
          orders under your own name.
        </Text>
      </View>
    </OverlayScaffold>
  );
}
