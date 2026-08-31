import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Field, Icon, Row, SectionHeading, VoltButton } from '../components/ui';
import { signInEmail, signInWithProvider, signUpEmail, SsoProvider } from '../lib/session';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// Shared email/password + SSO form. Used by the AuthLanding gate and the
// in-app 'auth' overlay. Calls onDone() after a successful sign-in.
export function AuthForm({ onDone }: { onDone: () => void }) {
  const { c, t } = useTheme();
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
        onDone();
      } else {
        const needsConfirm = await signUpEmail(name.trim(), email.trim(), password);
        if (needsConfirm) setConfirmSent(true);
        else onDone();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const sso = async (provider: SsoProvider) => {
    setBusy(true);
    setError(null);
    try {
      await signInWithProvider(provider);
      // Web redirects away; native resolves here once the deep link returns.
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 40 }}>
        <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mail" size={32} color={c.ink} />
        </View>
        <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>Confirm your email</Text>
        <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>
          We sent a confirmation link to {email.trim()}. Open it, then sign in here.
        </Text>
        <Pressable onPress={() => setConfirmSent(false)} style={{ marginTop: 18 }}>
          <Text style={[t.label, { color: c.accent }]}>Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      {/* SSO */}
      {/* spec 1.1: SSO as icon buttons, side by side. Facebook + Google come
          from the board; Apple is kept from main so a configured provider is
          not dropped by the redesign. */}
      <Row gap={10}>
        <SsoButton label="Facebook" icon="facebook" onPress={() => sso('facebook')} disabled={busy} />
        <SsoButton label="Google" icon="chrome" onPress={() => sso('google')} disabled={busy} />
        <SsoButton label="Apple" icon="command" onPress={() => sso('apple')} disabled={busy} />
      </Row>


      <Row style={{ marginVertical: 20 }} gap={12}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
        <Text style={[t.caption, { color: c.txt3 }]}>or with email</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      </Row>

      {mode === 'up' && (
        <>
          <SectionHeading style={{ marginBottom: 11 }}>Name</SectionHeading>
          <Field value={name} onChange={setName} placeholder="Your name" />
          <View style={{ height: 20 }} />
        </>
      )}
      <SectionHeading style={{ marginBottom: 11 }}>Email</SectionHeading>
      <Field value={email} onChange={setEmail} placeholder="you@email.com" keyboardType="email-address" icon="at-sign" />
      <View style={{ height: 20 }} />
      <SectionHeading style={{ marginBottom: 11 }}>Password</SectionHeading>
      <Field value={password} onChange={setPassword} placeholder="6+ characters" secure icon="lock" />

      {error && <Text style={[t.bodySm, { color: c.danger, marginTop: 14 }]}>{error}</Text>}

      <View style={{ height: 22 }} />
      <VoltButton
        label={busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
        enabled={canSubmit}
        onPress={submit}
      />

      <Pressable
        onPress={() => {
          setMode(mode === 'in' ? 'up' : 'in');
          setError(null);
        }}
        style={{ marginTop: 18, alignItems: 'center' }}
      >
        <Text style={[t.label, { color: c.accent }]}>
          {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
    </View>
  );
}

function SsoButton({ label, icon, onPress, disabled }: { label: string; icon: 'chrome' | 'facebook' | 'command'; onPress: () => void; disabled: boolean }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${label}`}
      style={{
        flex: 1,
        height: 52,
        borderRadius: 15,
        backgroundColor: c.surface,
        borderColor: c.line,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Icon name={icon} size={18} color={c.txt} />
      <Text style={[t.label, { color: c.txt }]}>{label}</Text>
    </Pressable>
  );
}

// In-app overlay wrapper (e.g. reached from Profile while in guest mode).
export function AuthOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="Account" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <AuthForm onDone={s.closeOverlay} />
        <Text style={[t.bodySm, { color: c.txt3, marginTop: 18 }]}>
          You can keep browsing as a guest — an account saves your bookings, communities and shop
          orders under your own name.
        </Text>
      </View>
    </OverlayScaffold>
  );
}
