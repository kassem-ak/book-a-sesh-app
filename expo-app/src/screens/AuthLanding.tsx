import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  ActionBar, BrandIcon, BrandMark, Button, Field, Icon, IconButton, Row, TAP_SLOP, VoltButton,
} from '../components/ui';
import { SSO_LABELS, SsoProvider, signInWithProvider } from '../lib/session';
import { SportsPicker } from '../components/SportsPicker';
import { saveSignupDraft } from '../lib/signup';
import { getDevicePoint } from '../lib/geo';
import { track } from '../lib/analytics';
import { AuthForm } from '../overlays/AuthOverlay';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

// Onboarding gate: Get Started -> role -> interests -> area -> account.
// Shown until a registered account signs in. It is the only way into the app.
type Step = 'start' | 'role' | 'interests' | 'where';
const STEPS: Step[] = ['start', 'role', 'interests', 'where'];

// The account screen is the fifth of five, but it is not a `Step`: it is a
// separate flag because it is also reachable straight off the start step. The
// progress dots have to count it anyway -- a run of four filled dots on the
// area step told someone they were finished when a whole screen was left.
const STEP_COUNT = STEPS.length + 1;

export function AuthLanding() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const s = useStore();
  const [step, setStep] = useState<Step>('start');
  const [savingDraft, setSavingDraft] = useState(false);
  // Back exists on every step but the first. Without it a mis-tapped role or a
  // typo'd email was unrecoverable, and there is no navigator above this
  // screen to supply one.
  const goBack = () => setStep((current) => STEPS[Math.max(STEPS.indexOf(current) - 1, 0)]);
  const [account, setAccount] = useState(false);
  const [accountMode, setAccountMode] = useState<'in' | 'up'>('in');
  const [ssoBusy, setSsoBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  // No default: this sets the account type, and a pre-filled answer is one
  // nobody made.
  const [kind, setKind] = useState<'coach' | 'trainee' | null>(null);
  const [seek, setSeek] = useState(s.authSeek);
  const [loc, setLoc] = useState(s.authLoc);
  const radius = s.searchRadius;
  const setRadius = (value: number) => s.set('searchRadius', value);

  const viewedStep = account ? 'account' : step;
  const lastViewed = useRef<string | null>(null);
  useEffect(() => {
    if (lastViewed.current === viewedStep) return;
    lastViewed.current = viewedStep;
    track('onboarding_step_viewed', { step: viewedStep });
  }, [viewedStep]);


  // The provider round-trip is started from the first step, exactly as the
  // board draws it. session.ts probes the provider first, so one that is not
  // enabled yet reports that plainly instead of opening a dead browser tab.
  const socialSignIn = async (provider: SsoProvider) => {
    setSsoBusy(true);
    setError(null);
    try { await signInWithProvider(provider); }
    catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed. Try email instead.'); }
    finally { setSsoBusy(false); }
  };

  // The gate's primary, chosen here and rendered once in the bar below, rather
  // than by each step in its own content. Inline it was centred at a fixed
  // 206px, and on the interests step that put it underneath a sports list long
  // enough to scroll the commit away from the choices it commits.
  const primary: { label: string; a11y: string; enabled?: boolean; busy?: boolean; onPress: () => void } =
    step === 'start'
      ? {
          label: 'NEXT',
          a11y: 'Next, choose what you are',
          onPress: () => {
            // The search field lives on the area step now; writing the key here
            // anyway keeps whatever the store already held from being dropped.
            s.set('authSeek', seek.trim());
            setStep('role');
          },
        }
      : step === 'role'
      ? {
          label: 'NEXT',
          a11y: 'Next, choose sports and hobbies',
          enabled: kind !== null,
          onPress: () => {
            if (!kind) return;
            s.set('signupIntent', kind);
            track('onboarding_role_chosen', { role: kind });
            s.set('mode', kind === 'coach' ? 'partners' : 'coaches');
            setStep('interests');
          },
        }
      : step === 'interests'
      ? {
          label: s.signupSports.length ? 'NEXT' : 'SKIP FOR NOW',
          a11y: 'Continue to your area',
          enabled: !savingDraft,
          busy: savingDraft,
          onPress: () => {
            setSavingDraft(true);
            setError(null);
            void saveSignupDraft({ role: kind === 'coach' ? 'coach' : 'member', sportIds: s.signupSports })
              .then(() => setStep('where'))
              .catch(() => setError('Could not keep your choices. Please try again.'))
              .finally(() => setSavingDraft(false));
          },
        }
      : {
          label: 'CREATE ACCOUNT',
          a11y: 'Continue to create your free account',
          onPress: () => {
            s.set('authLoc', loc.trim());
            s.set('authSeek', seek.trim());
            s.set('discSearch', seek.trim());
            setAccountMode('up');
            setAccount(true);
          },
        };

  const dots = <ProgressDots count={STEP_COUNT} index={account ? STEPS.length : STEPS.indexOf(step)} />;

  // The account screen owns its own scroll and bar because its primary is the
  // form's submit, which only the form knows the state of.
  if (account)
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <AnimatedGradient />
        <View style={{ paddingTop: insets.top + 26, paddingHorizontal: 26 }}>
          <StepBack label="Back to getting started" onPress={() => setAccount(false)} />
          <Text style={[t.pageTitle, { color: c.txt, marginBottom: 6 }]}>Account</Text>
        </View>
        <AuthForm
          initialEmail={email}
          initialMode={accountMode}
          onDone={() => setAccount(false)}
          note={dots}
          onEditChoices={() => { setAccount(false); setStep('role'); }}
        />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AnimatedGradient />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: step === 'interests' ? insets.top + 26 : Math.max(insets.top + 50, height * 0.32), paddingBottom: 26, paddingHorizontal: 26 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'start' ? (
          <>
            {/* The mark they just tapped, on the first thing they see. */}
            <BrandMark size={40} />
            <View style={{ height: 20 }} />
            <Text style={[t.bodySm, { color: c.txt2 }]}>Let&apos;s</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Get Started</Text>
            <View style={{ height: 22 }} />
            {/* The only thing step one asks for. The search words used to sit
                under it, which put a query box in front of someone before
                anything on screen had said what would be searched; they are on
                the area step now, beside the distance that scopes them. */}
            <Field value={email} onChange={setEmail} placeholder="Email" keyboardType="email-address" icon="at-sign" />
            {/* Below this line is every other way in. The step's own route is
                the button pinned in the bar; these are alternatives, and
                putting them after a rule is what says so without a word. */}
            <View style={{ height: 1, backgroundColor: c.line, marginTop: 28, marginBottom: 24 }} />
            {/* All four providers ship: Apple is not optional -- the App Store
                requires Sign in with Apple wherever other third-party sign-in
                is offered. */}
            <Row gap={20} style={{ justifyContent: 'center' }}>
              {([
                ['facebook', 'facebook'],
                ['google', 'google'],
                ['azure', 'windows'],
                ['apple', 'apple'],
              ] as const).map(([provider, icon]) => (
                <Pressable key={provider} onPress={() => void socialSignIn(provider)} disabled={ssoBusy} accessibilityRole="button" accessibilityLabel={`Continue with ${SSO_LABELS[provider]}`} accessibilityState={{ disabled: ssoBusy }} style={{ width: 48, height: 48, borderRadius: 9, borderWidth: 1, borderColor: c.txt, alignItems: 'center', justifyContent: 'center', opacity: ssoBusy ? 0.5 : 1 }}>
                  <BrandIcon name={icon} size={26} color={c.txt} />
                </Pressable>
              ))}
            </Row>
            {error && <Text style={[t.bodySm, { color: c.danger, marginTop: 16 }]}>{error}</Text>}
            <Text style={[t.bodySm, { color: c.txt2, textAlign: 'center', marginTop: 20 }]}>Free for coaches and members</Text>
            <Button label="Sign in or create account" icon="log-in" full style={{ marginTop: 12 }}
              onPress={() => { setAccountMode('in'); setAccount(true); }} />
          </>
        ) : step === 'role' ? (
          <>
            <StepBack onPress={goBack} />
            <Text style={[t.bodySm, { color: c.txt2 }]}>What</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Are you?</Text>
            <Row style={{ marginTop: 62, justifyContent: 'center' }} gap={12}>
              <RolePill label="Coach/Teacher" active={kind === 'coach'} onPress={() => setKind('coach')} />
              <RolePill label="Trainee/Student" active={kind === 'trainee'} onPress={() => setKind('trainee')} />
            </Row>
          </>
        ) : step === 'interests' ? (
          <View style={{ gap: 24 }}>
            <StepBack onPress={goBack} />
            <Text style={[t.pageTitle, { color: c.txt }]}>{kind === 'coach' ? 'What do you teach?' : 'Your interests'}</Text>
            <SportsPicker selected={s.signupSports} onChange={(ids) => s.set('signupSports', ids)} coach={kind === 'coach'} />
            {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
          </View>
        ) : (
          <>
            <StepBack onPress={goBack} />
            <Text style={[t.bodySm, { color: c.txt2 }]}>Hey Champ -</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Add an area label</Text>
            <LocationField value={loc} onChange={setLoc} />
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 12 }]}>
              Your area is a display label; it does not restrict results.
            </Text>
            <Text style={[t.labelSm, { color: c.txt, marginTop: 22 }]}>Distance preference</Text>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 6 }]}>
              This narrows results to people we can place within that distance of you. Anyone whose location we do not know stays visible.
            </Text>
            <RadiusSlider value={radius} onChange={setRadius} />
            <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={[t.caption, { color: c.txt2 }]}>1 Km</Text>
              <Text style={[t.caption, { color: c.accent }]}>{radius} Km</Text>
              <Text style={[t.caption, { color: c.txt2 }]}>100 Km</Text>
            </Row>
            {/* The search words, moved off step one. They belong here because
                this is the screen that scopes them -- the distance above and
                the words below are the two halves of the same search, and on
                step one there was nothing yet to say what would be searched. */}
            <View style={{ marginTop: 30 }}>
              <Field value={seek} onChange={setSeek} placeholder="Search Coach, Mentor" icon="search" />
            </View>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 12 }]}>
              The search words above start your search.
            </Text>
          </>
        )}
      </ScrollView>
      <View style={{ backgroundColor: c.bg, paddingBottom: insets.bottom }}>
        {/* The dots ride with the action that advances them. At the very bottom
            of the screen they were the one thing telling someone how much was
            left, and it sat furthest from the button doing the advancing. */}
        <ActionBar note={dots}>
          <VoltButton label={primary.label} accessibilityLabel={primary.a11y}
            enabled={primary.enabled ?? true} busy={primary.busy ?? false}
            busyLabel="Saving…" onPress={primary.onPress} />
        </ActionBar>
      </View>
    </View>
  );
}

function ProgressDots({ count, index }: { count: number; index: number }) {
  const { c } = useTheme();
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === index ? 22 : 6,
            height: 5,
            borderRadius: 99,
            backgroundColor: i === index ? c.volt : c.line,
          }}
        />
      ))}
    </View>
  );
}

function StepBack({ onPress, label = 'Back a step' }: { onPress: () => void; label?: string }) {
  return (
    <View style={{ alignItems: 'flex-start', marginBottom: 14 }}>
      <IconButton icon="arrow-left" accessibilityLabel={label} onPress={onPress} />
    </View>
  );
}

function RolePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, checked: active }}
      // The pill is drawn at 44 to sit level with the fields around it; the
      // slop is what takes the thing a thumb actually hits to 48.
      hitSlop={TAP_SLOP}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: active ? c.volt : c.surface,
        borderColor: active ? c.volt : c.line,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 13,
      }}
    >
      <Text style={[t.name, { color: active ? c.ink : c.txt }]}>{label}</Text>
    </Pressable>
  );
}

// Location input with the "locate me" crosshair. Board annotation: the icon
// turns volt once the field has content.
function LocationField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { c, t } = useTheme();
  const [focused, setFocused] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const iconColor = focused || value.length > 0 ? c.accent : c.txt3;

  // "Use my current location" used to write a fixed "Beirut, Lebanon". It now
  // asks the device. There is no reverse geocoder wired up, so the field takes
  // the real coordinates; when the device will not say, the field is left alone
  // and the failure is stated rather than papered over with a guess.
  const locate = async () => {
    setLocating(true);
    setLocateError(null);
    const point = await getDevicePoint();
    setLocating(false);
    if (!point) {
      setLocateError('Location unavailable. You can still add an area label; it will not filter results.');
      return;
    }
    onChange(`${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`);
  };

  return (
    <>
    <Row
      style={{
        marginTop: 26,
        backgroundColor: c.surface,
        borderColor: c.line,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 6,
        minHeight: 52,
      }}
      gap={10}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Area label (optional)"
        placeholderTextColor={c.txt3}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Area label (optional)"
        style={[t.body, { flex: 1, color: c.txt, padding: 0, paddingVertical: 10 }]}
      />
      <Pressable
        onPress={() => void locate()}
        disabled={locating}
        accessibilityRole="button"
        accessibilityLabel="Use my current location"
        accessibilityState={{ disabled: locating, busy: locating }}
        hitSlop={14}
        style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', opacity: locating ? 0.5 : 1 }}
      >
        <Icon name="crosshair" size={18} color={iconColor} />
      </Pressable>
    </Row>
    {locateError ? <Text style={[t.caption, { color: c.danger, marginTop: 6 }]}>{locateError}</Text> : null}
    </>
  );
}

// Slider with the runner-figure thumb from the board.
function RadiusSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const pct = (value - 1) / 99;
  const nudge = (delta: number) => onChange(Math.max(1, Math.min(100, value + delta)));
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        if (width) onChange(Math.round(1 + Math.max(0, Math.min(1, e.nativeEvent.locationX / width)) * 99));
      }}
      onResponderMove={(e) => {
        if (!width) return;
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
        onChange(Math.round(1 + ratio * 99));
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Distance preference in kilometres"
      accessibilityHint="Narrows results to people within this distance. Profiles with no known location stay visible."
      accessibilityValue={{ min: 1, max: 100, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') nudge(1);
        if (e.nativeEvent.actionName === 'decrement') nudge(-1);
      }}
      style={{ marginTop: 16, height: 44, justifyContent: 'center' }}
    >
      <View style={{ height: 2, backgroundColor: c.line, borderRadius: 2 }} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          width: pct * width,
          height: 2,
          backgroundColor: c.volt,
          borderRadius: 2,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: Math.max(0, Math.min(width - 34, pct * width - 17)),
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={34} height={34} viewBox="0 0 34 34">
          <Circle cx="23" cy="5" r="3" fill={c.volt} />
          <Path d="M12 11h8l-6 10 9 5-10 7M15 20l-9 9M20 11l6 9 6 1M3 13h5M6 7h6" fill="none" stroke={c.volt} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </View>
  );
}

// Board annotation: "animated gradient" — two blurred radial blobs (volt + cyan)
// drifting on 14 s / 18 s ease-in-out infinite loops.
function AnimatedGradient() {
  const { c } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopFor = (v: Animated.Value, halfCycleMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: halfCycleMs,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: halfCycleMs,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    const voltLoop = loopFor(a, 7000); // 14 s round trip
    const cyanLoop = loopFor(b, 9000); // 18 s round trip
    voltLoop.start();
    cyanLoop.start();
    return () => {
      voltLoop.stop();
      cyanLoop.stop();
      a.stopAnimation();
      b.stopAnimation();
    };
  }, [a, b]);

  const blobW = W * 1.2;
  const voltH = H * 0.8;
  const cyanH = H * 0.85;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {/* volt blob — gradShift, 14 s */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -H * 0.18,
          left: -W * 0.22,
          width: blobW,
          height: voltH,
          transform: [
            { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-blobW * 0.06, blobW * 0.06] }) },
            { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-voltH * 0.04, voltH * 0.05] }) },
            { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1.3] }) },
          ],
        }}
      >
        <Blob color={c.volt} opacity={0.3} id="authBlobVolt" />
      </Animated.View>

      {/* cyan blob — gradShift2, 18 s */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: -H * 0.24,
          right: -W * 0.26,
          width: blobW,
          height: cyanH,
          transform: [
            { translateX: b.interpolate({ inputRange: [0, 1], outputRange: [blobW * 0.05, -blobW * 0.07] }) },
            { translateY: b.interpolate({ inputRange: [0, 1], outputRange: [cyanH * 0.06, -cyanH * 0.06] }) },
            { scale: b.interpolate({ inputRange: [0, 1], outputRange: [1.2, 1.35] }) },
          ],
        }}
      >
        <Blob color={c.cyan} opacity={0.2} id="authBlobCyan" />
      </Animated.View>

      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="authScrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bg} stopOpacity={0.35} />
            <Stop offset="1" stopColor={c.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#authScrim)" />
      </Svg>
    </View>
  );
}

function Blob({ color, opacity, id }: { color: string; opacity: number; id: string }) {
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.7" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
