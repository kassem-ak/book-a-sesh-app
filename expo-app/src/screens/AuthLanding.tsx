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
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Field, Icon, Row, SectionHeading, VoltButton } from '../components/ui';
import { AuthForm } from '../overlays/AuthOverlay';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// Onboarding gate from the redesign board: Get Started -> Are you? -> Where are
// we looking? Shown until a real account signs in or guest mode is chosen.
type Step = 'start' | 'role' | 'where';
const STEPS: Step[] = ['start', 'role', 'where'];

// Board: the second gradient blob is cyan. There is no cyan token in the theme
// (Agent A owns the palette), so it is pinned locally to the prototype value.
// v2 spec: default search radius is 12 km (was 25).
const DEFAULT_RADIUS_KM = 12;

export function AuthLanding() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStore();
  const [step, setStep] = useState<Step>('start');
  const [kind, setKind] = useState<'coach' | 'trainee'>('trainee');
  // The chosen radius has to outlive onboarding: Discover and Maps filter by it.
  const radius = useStore((st) => st.searchRadius);
  const setRadius = (v: number) => useStore.getState().set('searchRadius', v);
  // `authSeek` / `authLoc` are prototype state that the store does not carry yet,
  // so they are read defensively and mirrored back on NEXT.
  const [seek, setSeek] = useState<string>(() => (useStore.getState() as any).authSeek ?? '');
  const [loc, setLoc] = useState<string>(() => (useStore.getState() as any).authLoc ?? 'Beirut, Lebanon');

  const stepIndex = STEPS.indexOf(step);

  const finish = () => {
    (s.set as any)('authLoc', loc.trim());
    s.set('guestMode', true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Board annotation: "animated gradient" — behind all three steps. */}
      <AnimatedGradient />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 74,
          paddingHorizontal: 22,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'start' && (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>Let&apos;s</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Get Started</Text>
            <View style={{ height: 22 }} />

            {/* spec 10.1: the "Search Coach, Mentor" field sits with the email field. */}
            <SectionHeading style={{ marginBottom: 11 }}>Looking for</SectionHeading>
            <Field
              value={seek}
              onChange={setSeek}
              placeholder="Search Coach, Mentor"
              icon="search"
            />

            <View style={{ height: 18 }} />
            <NextButton
              label="NEXT"
              accessibilityLabel="Next, choose what you are"
              onPress={() => {
                (s.set as any)('authSeek', seek.trim());
                setStep('role');
              }}
            />

            <View style={{ height: 22 }} />
            {/* email + password + Facebook/Google SSO live in the shared form */}
            <AuthForm onDone={() => setStep('role')} />
          </>
        )}

        {step === 'role' && (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>What</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Are you?</Text>
            <Row style={{ marginTop: 46, justifyContent: 'center' }} gap={12}>
              <RolePill label="Coach/Teacher" active={kind === 'coach'} onPress={() => setKind('coach')} />
              <RolePill label="Trainee/Student" active={kind === 'trainee'} onPress={() => setKind('trainee')} />
            </Row>
            <View style={{ height: 40 }} />
            <VoltButton
              label="NEXT"
              onPress={() => {
                // Intent only. The role is a property of the account and is
                // resolved from the server by refreshRole(); letting this pill
                // set it handed anyone the paid coach product for free.
                s.set('signupIntent', kind === 'coach' ? 'coach' : 'trainee');
                setStep('where');
              }}
            />
          </>
        )}

        {step === 'where' && (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>Hey Champ -</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Where are we looking?</Text>

            <LocationField value={loc} onChange={setLoc} />

            <Text style={[t.labelSm, { color: c.txt, marginTop: 22 }]}>Search Radius</Text>
            <RadiusSlider value={radius} onChange={setRadius} />
            <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={[t.caption, { color: c.txt2 }]}>1Km</Text>
              <Text style={[t.caption, { color: c.accent }]}>{radius} Km</Text>
              <Text style={[t.caption, { color: c.txt2 }]}>100 Km</Text>
            </Row>

            <View style={{ height: 36 }} />
            <VoltButton label="NEXT" onPress={finish} />
          </>
        )}
      </ScrollView>

      {/* spec 10: progress dots at the bottom of all three steps */}
      <ProgressDots count={STEPS.length} index={stepIndex} bottom={insets.bottom + 20} />
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

// Secondary "NEXT" pill from the board (surface2 fill + chevron), used on step 1
// where the volt CTA belongs to the shared auth form.
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
        height: 52,
        borderRadius: 999,
        borderColor: c.line,
        borderWidth: 1,
        backgroundColor: c.surface2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Text numberOfLines={1} style={[t.label, { color: c.txt, flexShrink: 0, paddingRight: 2 }]}>{label}</Text>
      <Icon name="chevron-right" size={15} color={c.txt2} />
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
        paddingHorizontal: 20,
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
  const iconColor = focused || value.length > 0 ? c.accent : c.txt3;
  return (
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
        onPress={() => onChange('Beirut, Lebanon')}
        accessibilityRole="button"
        accessibilityLabel="Use my current location"
        hitSlop={14}
        style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="crosshair" size={18} color={iconColor} />
      </Pressable>
    </Row>
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
          left: Math.max(0, pct * width - 17),
          width: 34,
          height: 34,
          borderRadius: 999,
          backgroundColor: c.surface2,
          borderColor: c.line,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="user" size={16} color={c.volt} />
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

      {/* scrim: linear fade down to the page background (banded, no gradient dep) */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {[0.35, 0.48, 0.6, 0.72, 0.85, 1].map((o, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: alpha(c.bg, o) }} />
        ))}
      </View>
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
