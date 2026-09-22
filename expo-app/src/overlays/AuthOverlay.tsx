import React, { ReactNode, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSports } from '../components/useSports';
import {
  ActionBar, BrandIcon, BrandName, Button, Card, Field, Icon, Row, SectionHeading, VoltButton,
} from '../components/ui';
import { signInEmail, signInWithProvider, signUpEmail, SSO_LABELS, SsoProvider } from '../lib/session';
import { analyticsErrorCode, track } from '../lib/analytics';
import { saveSignupDraft } from '../lib/signup';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

// Shared email/password + SSO form. Used by the AuthLanding gate, which is the
// only way into the app. Calls onDone() after a successful sign-in.
//
// It owns a scroll and a bar of its own rather than sitting inside the gate's,
// because its submit is the last step's primary and only this component knows
// whether that submit is allowed yet.
export function AuthForm({ onDone, initialEmail = '', initialMode = 'in', note, onEditChoices }: {
  onDone: () => void;
  initialEmail?: string;
  initialMode?: 'in' | 'up';
  /** The gate's progress dots, carried into this form's own action bar so the
   *  indicator does not vanish on the one step that still has a write left. */
  note?: ReactNode;
  /** Back to the steps that collected the role and the sports. Without it the
   *  read-back below is a dead end, so the read-back is only shown with it. */
  onEditChoices?: () => void;
}) {
  const { c, t } = useTheme();
  const { sports } = useSports();
  const s = useStore();
  const [mode, setMode] = useState<'in' | 'up'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
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
        await saveSignupDraft({ role: s.signupIntent === 'coach' ? 'coach' : 'member', sportIds: s.signupSports, email: email.trim().toLowerCase() });
        const needsConfirm = await signUpEmail(name.trim(), email.trim(), password);
        if (needsConfirm) setConfirmSent(true);
        else onDone();
      }
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const sso = async (provider: SsoProvider) => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'up') await saveSignupDraft({ role: s.signupIntent === 'coach' ? 'coach' : 'member', sportIds: s.signupSports });
      const signedIn = await signInWithProvider(provider);
      // Web redirects away; native resolves here once the deep link returns.
      if (signedIn) onDone();
    } catch (e) {
      const raw = e instanceof Error ? e.message : '';
      // Until the provider is turned on in Supabase Auth, GoTrue answers
      // "Unsupported provider: provider is not enabled" — not something to
      // show a person.
      setError(
        /provider is not enabled|unsupported provider/i.test(raw)
          ? `${SSO_LABELS[provider]} sign-in is not set up yet. Use your email and password for now.`
          : raw || 'Sign-in failed',
      );
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <Shell
        note={note}
        action={(
          <Button label="Back to sign in" icon="arrow-left" full
            onPress={() => { setConfirmSent(false); setMode('in'); }} />
        )}
      >
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mail" size={32} color={c.ink} />
          </View>
          <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>Confirm your email</Text>
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>
            We sent a confirmation link to {email.trim()}. Open it, then sign in here.
          </Text>
        </View>
      </Shell>
    );
  }

  return (
    <Shell
      note={note}
      action={(
        <VoltButton
          label={mode === 'in' ? 'Sign in' : 'Create account'}
          icon={mode === 'in' ? 'log-in' : 'user-plus'}
          busy={busy}
          busyLabel="Please wait…"
          enabled={canSubmit}
          onPress={submit}
        />
      )}
    >
      {mode === 'up' && <View style={{ gap: 16, marginBottom: 24 }}>
        <Text style={[t.bodySm, { color: c.txt2 }]}>Free for coaches and members. Add your photo and profile details after creating your account.</Text>
        {/* A read-back, not a second set of controls. The role pills and the
            whole sports catalogue used to be repeated here, two screens after
            the gate had already asked for both -- which reads as the first
            answers having been lost, and puts the longest list in the app
            between someone and the button that finishes signing them up.
            Changing an answer goes back to the step that owns it, so there is
            one place each is decided. */}
        {onEditChoices && (
          <Card style={{ padding: 14, gap: 10 }}>
            <SectionHeading>Your choices</SectionHeading>
            <Text style={[t.label, { color: c.txt }]}>
              {(s.signupIntent ?? 'trainee') === 'coach' ? 'Coach/Teacher' : 'Trainee/Student'}
            </Text>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              {s.signupSports.length
                ? s.signupSports.map((id) => sports?.find((sport) => sport.id === id)?.name ?? 'Unavailable').join(' · ')
                : 'No sports or hobbies chosen yet.'}
            </Text>
            {/* Rule 2: this belongs to the card it changes, not to the bar. */}
            <Row>
              <Button label="Edit" icon="edit-2" enabled={!busy}
                accessibilityLabel="Change your role, sports and hobbies"
                onPress={onEditChoices} />
            </Row>
          </Card>
        )}
      </View>}
      {/* SSO — Facebook, Google, Microsoft and Apple in a 2x2 grid. */}
      <View style={{ gap: 12 }}>
        <Row gap={12}>
          <SsoButton provider="facebook" icon="facebook" onPress={sso} disabled={busy} />
          <SsoButton provider="google" icon="google" onPress={sso} disabled={busy} />
        </Row>
        <Row gap={12}>
          <SsoButton provider="azure" icon="windows" onPress={sso} disabled={busy} />
          <SsoButton provider="apple" icon="apple" onPress={sso} disabled={busy} />
        </Row>
      </View>


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

      {error && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive"
          style={[t.bodySm, { color: c.danger, marginTop: 14 }]}>{error}</Text>
      )}

      {/* Switching between signing in and signing up is a change of what this
          screen is, not the thing it is for, so it stays in the content while
          the submit sits in the bar. */}
      <Button
        label={mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        icon={mode === 'in' ? 'user-plus' : 'log-in'}
        accessibilityLabel={mode === 'in' ? 'Create an account' : 'Sign in to an existing account'}
        enabled={!busy}
        full
        style={{ marginTop: 22 }}
        onPress={() => {
          setMode(mode === 'in' ? 'up' : 'in');
          setError(null);
        }}
      />
    </Shell>
  );
}

// Scroll plus a pinned bar, the shape every screen in the app has. The form
// used to be a bare column handed to whatever scrolled it, so its submit sat
// below a 2x2 provider grid, a divider and three fields and scrolled away.
function Shell({ note, action, children }: { note?: ReactNode; action: ReactNode; children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 16, paddingBottom: 26 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      <View style={{ backgroundColor: c.bg, paddingBottom: insets.bottom }}>
        <ActionBar note={note}>{action}</ActionBar>
      </View>
    </View>
  );
}

function SsoButton({
  provider,
  icon,
  onPress,
  disabled,
}: {
  provider: SsoProvider;
  icon: BrandName;
  onPress: (p: SsoProvider) => void;
  disabled: boolean;
}) {
  const { c, t } = useTheme();
  const label = SSO_LABELS[provider];
  return (
    <Pressable
      onPress={disabled ? undefined : () => onPress(provider)}
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${label}`}
      accessibilityState={{ disabled }}
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
        gap: 8,
        paddingHorizontal: 10,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <BrandIcon name={icon} size={18} color={c.txt} />
      {/* flexShrink:0 + trailing pad: Android clips custom-font labels laid
          out in a row when it measures them a hair too narrow. */}
      {/* No line clamp: clamping made Android ellipsize these short labels. */}
      <Text style={[t.label, { color: c.txt, flexShrink: 0, paddingRight: 2 }]}>{label}</Text>
    </Pressable>
  );
}
