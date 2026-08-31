import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Row, VoltButton } from '../components/ui';
import { AuthForm } from '../overlays/AuthOverlay';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// Onboarding gate from the redesign board: Get Started -> Are you? -> Where are
// we looking? Shown until a real account signs in or guest mode is chosen.
type Step = 'start' | 'role' | 'where';

export function AuthLanding() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStore();
  const [step, setStep] = useState<Step>('start');
  const [kind, setKind] = useState<'coach' | 'trainee'>('trainee');
  const [radius, setRadius] = useState(25);

  const finish = () => s.set('guestMode', true);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AnimatedGradient />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 26,
          paddingHorizontal: 22,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'start' && (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>Let&apos;s</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Get Started</Text>
            <View style={{ height: 22 }} />
            {/* email + password + SSO live in the shared form */}
            <AuthForm onDone={() => setStep('role')} />
            <Pressable onPress={() => setStep('role')} style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={[t.label, { color: c.txt2 }]}>Continue as guest →</Text>
            </Pressable>
          </>
        )}

        {step === 'role' && (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>What</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Are you?</Text>
            <Row style={{ marginTop: 46, justifyContent: 'center' }} gap={12}>
              <RolePill label="Coach/Teacher" active={kind === 'coach'} onPress={() => setKind('coach')} />
              <RolePill label="Trainee/ Student" active={kind === 'trainee'} onPress={() => setKind('trainee')} />
            </Row>
            <View style={{ height: 40 }} />
            <VoltButton
              label="NEXT"
              onPress={() => {
                s.set('role', kind === 'coach' ? 'COACH' : 'USER');
                setStep('where');
              }}
            />
          </>
        )}

        {step === 'where' && (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>Hey Champ -</Text>
            <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Where are we looking?</Text>

            <Row
              style={{
                marginTop: 26,
                backgroundColor: c.surface,
                borderColor: c.line,
                borderWidth: 1,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 13,
              }}
            >
              <Text style={[t.body, { color: c.txt, flex: 1 }]}>Beirut, Lebanon</Text>
              <Icon name="crosshair" size={18} color={c.accent} />
            </Row>

            <Text style={[t.labelSm, { color: c.txt, marginTop: 22 }]}>Search Radius</Text>
            <RadiusSlider value={radius} onChange={setRadius} />
            <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={[t.caption, { color: c.txt2 }]}>1Km</Text>
              <Text style={[t.caption, { color: c.txt2 }]}>100 Km</Text>
            </Row>

            <View style={{ height: 36 }} />
            <VoltButton label="NEXT" onPress={finish} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RolePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
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

// Slider with the runner-figure thumb from the board.
function RadiusSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const pct = (value - 1) / 99;
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
      style={{ marginTop: 16, height: 34, justifyContent: 'center' }}
    >
      <View style={{ height: 2, backgroundColor: c.volt, borderRadius: 2 }} />
      <View
        style={{
          position: 'absolute',
          left: Math.max(0, pct * width - 14),
          width: 28,
          height: 28,
          borderRadius: 999,
          backgroundColor: c.volt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="user" size={15} color={c.ink} />
      </View>
    </View>
  );
}

// Board annotation: "animated gradient" behind the Get Started screen.
function AnimatedGradient() {
  const { c } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 4200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -60,
        right: -60,
        bottom: -120,
        height: 420,
        borderRadius: 999,
        backgroundColor: alpha(c.volt, 0.12),
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, -20] }) }],
      }}
    />
  );
}
