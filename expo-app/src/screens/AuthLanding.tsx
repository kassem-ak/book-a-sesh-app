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
  BrandIcon, BrandMark, Button, Field, Icon, IconButton, Row, VoltButton,
} from '../components/ui';
import { SSO_LABELS, SsoProvider, signInWithProvider } from '../lib/session';
import { getDevicePoint } from '../lib/geo';
import { track } from '../lib/analytics';
import { AuthForm } from '../overlays/AuthOverlay';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

// The front door: choose how to sign in, nothing more.
//
// Role, interests and area used to be asked HERE, before the account existed --
// which meant they were only ever asked of people who chose email. Every
// single-sign-on button skipped them. They now live on CompleteRegistration,
// which every method reaches after signing in, so the questions are the same
// whichever button somebody pressed.

export function AuthLanding() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const s = useStore();
  const [account, setAccount] = useState(false);
  const [accountMode, setAccountMode] = useState<'in' | 'up'>('in');
  const [ssoBusy, setSsoBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [seek, setSeek] = useState(s.authSeek);

  const viewedStep = account ? 'account' : 'start';
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
            <AuthForm initialEmail={email} initialMode={accountMode} onDone={() => setAccount(false)} />
          </>
        ) : (
          <>
            {/* The mark they just tapped, on the first thing they see. */}
            <BrandMark size={40} />
            <View style={{ height: 20 }} />
            <Text style={[t.bodySm, { color: c.txt2 }]}>Let&apos;s</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Get Started</Text>
            <View style={{ height: 22 }} />
            <Field value={email} onChange={setEmail} placeholder="Email" keyboardType="email-address" icon="at-sign" />
            <View style={{ height: 12 }} />
            <Field value={seek} onChange={setSeek} placeholder="Search Coach, Mentor" icon="search" />
            <View style={{ height: 28 }} />
            {/* Straight to the account. What you are, what you do and where
                are asked once you are in, on the same form whichever way you
                came. */}
            <NextButton label="NEXT" accessibilityLabel="Next, create your account" onPress={() => {
              s.set('authSeek', seek.trim());
              s.set('discSearch', seek.trim());
              setAccountMode('up');
              setAccount(true);
            }} />
            {/* All four providers ship: Apple is not optional -- the App Store
                requires Sign in with Apple wherever other third-party sign-in
                is offered. */}
            <Row gap={20} style={{ justifyContent: 'center', marginTop: 27 }}>
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
        )}
      </ScrollView>
    </View>
  );
}


// Centered volt NEXT button from the board.
// The gate's primary action, and a back control for every step after the
// first. NextButton used to be hand-rolled -- its own radius, a border on a
// volt fill, a fixed width, 44 high where a primary is 52, and no disabled or
// busy state at all -- which is how the interests step ended up firing a
// network write on every tap.
function NextButton({ label, accessibilityLabel, onPress, enabled = true, busy = false }: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  enabled?: boolean;
  busy?: boolean;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 206, maxWidth: '100%' }}>
        <VoltButton label={label} accessibilityLabel={accessibilityLabel}
          enabled={enabled} busy={busy} busyLabel="Saving…" onPress={onPress} />
      </View>
    </View>
  );
}


export function RolePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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
export function LocationField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
export function RadiusSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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
