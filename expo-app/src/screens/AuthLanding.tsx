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
import { BrandIcon, Field, Icon, Row } from '../components/ui';
import { signInWithProvider, SSO_LABELS, SsoProvider } from '../lib/session';
import { getDevicePoint } from '../lib/geo';
import { AuthForm } from '../overlays/AuthOverlay';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

// Onboarding gate from the redesign board: Get Started -> Are you? -> Where are
// we looking? Shown until a real account signs in or guest mode is chosen.
type Step = 'start' | 'role' | 'where';
const STEPS: Step[] = ['start', 'role', 'where'];

export function AuthLanding() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const s = useStore();
  const [step, setStep] = useState<Step>('start');
  const [account, setAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'coach' | 'trainee'>('trainee');
  const [seek, setSeek] = useState(s.authSeek);
  const [loc, setLoc] = useState(s.authLoc);
  const radius = s.searchRadius;
  const setRadius = (value: number) => s.set('searchRadius', value);

  const finish = () => {
    s.set('authLoc', loc.trim());
    s.set('discSearch', seek.trim());
    s.set('guestMode', true);
  };
  const socialSignIn = async (provider: SsoProvider) => {
    setBusy(true);
    setError(null);
    try { await signInWithProvider(provider); }
    catch (error) { setError(error instanceof Error ? error.message : 'Sign-in failed. Try email instead.'); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AnimatedGradient />
      <ScrollView
        contentContainerStyle={{ paddingTop: account ? insets.top + 26 : Math.max(insets.top + 50, height * 0.32), paddingBottom: insets.bottom + 74, paddingHorizontal: 26 }}
        keyboardShouldPersistTaps="handled"
      >
        {account ? (
          <>
            <Pressable onPress={() => setAccount(false)} accessibilityRole="button" accessibilityLabel="Back to getting started" style={{ minHeight: 44, justifyContent: 'center', marginBottom: 18 }}>
              <Icon name="arrow-left" size={22} color={c.txt} />
            </Pressable>
            <Text style={[t.pageTitle, { color: c.txt, marginBottom: 22 }]}>Account</Text>
            <AuthForm initialEmail={email} onDone={() => setAccount(false)} />
          </>
        ) : step === 'start' ? (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>Let&apos;s</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Get Started</Text>
            <View style={{ height: 22 }} />
            <Field value={email} onChange={setEmail} placeholder="Email" keyboardType="email-address" icon="at-sign" />
            <View style={{ height: 12 }} />
            <Field value={seek} onChange={setSeek} placeholder="Search Coach, Mentor" icon="search" />
            <View style={{ height: 28 }} />
            <NextButton label="NEXT" accessibilityLabel="Next, choose what you are" onPress={() => {
              s.set('authSeek', seek.trim());
              setStep('role');
            }} />
            {/* The board draws two square icon buttons (Facebook, Google).
                All four providers ship, so the same square treatment is used
                for each: Apple is not optional -- the App Store requires Sign
                in with Apple wherever other third-party sign-in is offered. */}
            <Row gap={20} style={{ justifyContent: 'center', marginTop: 27 }}>
              {([
                ['facebook', 'facebook'],
                ['google', 'google'],
                ['azure', 'windows'],
                ['apple', 'apple'],
              ] as const).map(([provider, icon]) => (
                <Pressable key={provider} onPress={() => void socialSignIn(provider)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Continue with ${SSO_LABELS[provider]}`} accessibilityState={{ disabled: busy }} style={{ width: 48, height: 48, borderRadius: 9, borderWidth: 1, borderColor: c.txt, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
                  <BrandIcon name={icon} size={26} color={c.txt} />
                </Pressable>
              ))}
            </Row>
            {error && <Text style={[t.bodySm, { color: c.danger, marginTop: 16 }]}>{error}</Text>}
            <Pressable accessibilityRole="button" onPress={() => setAccount(true)} style={{ minHeight: 44, justifyContent: 'center', marginTop: 12 }}>
              <Text style={[t.labelSm, { color: c.txt2, textAlign: 'center' }]}>Sign in or create account</Text>
            </Pressable>
          </>
        ) : step === 'role' ? (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>What</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Are you?</Text>
            <Row style={{ marginTop: 62, justifyContent: 'center' }} gap={12}>
              <RolePill label="Coach/Teacher" active={kind === 'coach'} onPress={() => setKind('coach')} />
              <RolePill label="Trainee/Student" active={kind === 'trainee'} onPress={() => setKind('trainee')} />
            </Row>
            <View style={{ height: 54 }} />
            <NextButton label="NEXT" accessibilityLabel="Next, choose your area" onPress={() => {
              s.set('signupIntent', kind);
              setStep('where');
            }} />
          </>
        ) : (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>Hey Champ -</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Where are we looking?</Text>
            <LocationField value={loc} onChange={setLoc} />
            <Text style={[t.labelSm, { color: c.txt, marginTop: 22 }]}>Search Radius</Text>
            <RadiusSlider value={radius} onChange={setRadius} />
            <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={[t.caption, { color: c.txt2 }]}>1 Km</Text>
              <Text style={[t.caption, { color: c.accent }]}>{radius} Km</Text>
              <Text style={[t.caption, { color: c.txt2 }]}>100 Km</Text>
            </Row>
            <View style={{ height: 36 }} />
            <NextButton label="NEXT" accessibilityLabel="Start browsing as a guest" onPress={finish} />
            <Text style={[t.caption, { color: c.txt3, textAlign: 'center', marginTop: 12 }]}>Browse as a guest</Text>
          </>
        )}
      </ScrollView>
      {!account && <ProgressDots count={STEPS.length} index={STEPS.indexOf(step)} bottom={insets.bottom + 20} />}
    </View>
  );
}

function ProgressDots({ count, index, bottom }: { count: number; index: number; bottom: number }) {
  const { c } = useTheme();
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      style={{
        position: 'absolute',
        left: 26,
        right: 26,
        bottom,
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center',
      }}
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

// Centered volt NEXT button from the board.
function NextButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        minHeight: 44,
        width: 206,
        alignSelf: 'center',
        borderRadius: 11,
        borderColor: c.line,
        borderWidth: 1,
        backgroundColor: c.volt,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Text numberOfLines={1} style={[t.label, { color: c.ink, flexShrink: 0, paddingRight: 2 }]}>{label}</Text>
      <View style={{ position: 'absolute', right: 10 }}><Icon name="chevron-right" size={20} color={c.ink} /></View>
    </Pressable>
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
      setLocateError('Location unavailable — type your area instead.');
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
        placeholder="Location"
        placeholderTextColor={c.txt3}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Location"
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
      accessibilityLabel="Search radius in kilometres"
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
