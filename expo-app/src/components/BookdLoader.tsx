import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { loader } from '../theme/colors';

// The BOOKD loading animation, from the design handoff.
//
// The icon assembles itself once -- tile, then ring, then shaft, each arriving
// from a different direction -- and then the shaft orbits the ring until the
// app is ready. Every timing below is the handoff's, in milliseconds.
//
// Ported rather than transcribed: the reference is CSS keyframes on SVG nodes,
// and React Native cannot animate an SVG node's transform on the native
// driver. So each layer is its own <Svg> in its own Animated.View, stacked and
// sized identically. The views carry the motion, the SVGs only draw. That is
// also what keeps the whole thing off the JS thread, which matters because
// this runs while the app is still doing its boot work.

// The handoff's viewBox. Intro offsets are given in these units, so they scale
// with the rendered size rather than being pixel values that only work at 186.
const BOX = 1024;
// The ring's centre, which is also the orbit's pivot -- and, conveniently, the
// exact centre of the square, so rotating the view rotates about the right
// point without an offset.
const CENTRE = 512;

const EASE = Easing.bezier(0.2, 0.9, 0.25, 1);
const BAR_EASE = Easing.bezier(0.65, 0, 0.35, 1);
// Module constants, not inline calls. `Easing.inOut(Easing.ease)` builds a new
// function every time it runs, and a fresh identity in an effect's dependency
// list restarts that effect on every render -- which, for a loop that waits a
// second before it starts, means it never starts at all.
const BREATHE_EASE = Easing.inOut(Easing.ease);
const RISE_EASE = Easing.out(Easing.ease);
const EXIT_EASE = Easing.out(Easing.ease);

const LETTERS = ['B', 'O', 'O', 'K', 'D'];
// One delay per letter, 80ms apart, from the handoff.
const LETTER_DELAYS = [1150, 1230, 1310, 1390, 1470];

/** Drives a value 0 -> 1 once, after a delay. */
function useIntro(delay: number, duration: number, enabled: boolean) {
  const value = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  useEffect(() => {
    if (!enabled) return undefined;
    const run = Animated.timing(value, {
      toValue: 1, duration, delay, easing: EASE, useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [value, delay, duration, enabled]);
  return value;
}

/** Drives a value 0 -> 1 forever, after a delay.
 *
 *  The delay is part of the animation rather than a setTimeout around it. A
 *  timeout is cancelled by this effect's own cleanup, and this component
 *  re-renders while it is waiting -- the fonts land, the app becomes ready --
 *  so a timeout long enough to matter was being cleared and restarted before
 *  it ever fired. Sequencing a delay in front of the loop cannot be outrun
 *  that way. */
function useLoop(delay: number, duration: number, easing: (v: number) => number, enabled: boolean) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return undefined;
    const run = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }),
      ),
    ]);
    run.start();
    return () => { run.stop(); value.setValue(0); };
  }, [value, delay, duration, easing, enabled]);
  return value;
}

export function BookdLoader({
  theme,
  label = 'Shelving your books',
  showWordmark = true,
  done = false,
  onExited,
}: {
  theme: 'dark' | 'light';
  label?: string;
  showWordmark?: boolean;
  /** The app is ready. The loader fades out and then calls `onExited`. */
  done?: boolean;
  onExited?: () => void;
}) {
  const t = loader[theme];
  const { width } = useWindowDimensions();
  // 48% of the screen, capped at the handoff's 186.
  const size = Math.min(width * 0.48, 186);
  const unit = size / BOX;

  // Under reduced motion the icon is shown finished and only the progress bar
  // moves -- the one part that says "still working" rather than decorating.
  const [still, setStill] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => { if (live) setStill(on); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => setStill(on));
    return () => { live = false; sub.remove(); };
  }, []);
  const moving = !still;

  const tile = useIntro(0, 800, moving);
  const ring = useIntro(100, 780, moving);
  const shaft = useIntro(220, 800, moving);
  const orbit = useLoop(1050, 2800, Easing.linear, moving);
  const breathe = useLoop(1100, 2600, BREATHE_EASE, moving);
  const bar = useLoop(1200, 1500, BAR_EASE, true);

  // The fade is the only part that runs on readiness rather than on a clock.
  const exit = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!done) return undefined;
    const run = Animated.timing(exit, {
      toValue: 0, duration: 250, easing: EXIT_EASE, useNativeDriver: true,
    });
    run.start(({ finished }) => { if (finished) onExited?.(); });
    return () => run.stop();
  }, [done, exit, onExited]);

  const layer = { position: 'absolute' as const, width: size, height: size };

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 34,
        opacity: exit,
      }}
    >
      <View
        // Decorative: the accessible name is on the container, and reading the
        // shapes out one at a time would say nothing useful.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: size, height: size }}
      >
        {/* Tile: arrives first, turning and growing into place. */}
        <Animated.View style={[layer, {
          opacity: tile.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [
            { scale: tile.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) },
            { rotate: tile.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) },
          ],
        }]}>
          <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
            <Rect width={BOX} height={BOX} rx={210} ry={210} fill={ICON.tile} />
          </Svg>
        </Animated.View>

        {/* Ring: swings up from the lower left, then breathes once it is home.
            The two never overlap in time, so they compose without fighting. */}
        <Animated.View style={[layer, {
          opacity: ring,
          transform: [
            { translateX: ring.interpolate({ inputRange: [0, 1], outputRange: [-160 * unit, 0] }) },
            { translateY: ring.interpolate({ inputRange: [0, 1], outputRange: [180 * unit, 0] }) },
            { scale: Animated.multiply(
              ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
              breathe.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.045, 1] }),
            ) },
          ],
        }]}>
          <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
            <Circle cx={CENTRE} cy={CENTRE} r={260} fill="none"
              stroke={ICON.ring} strokeWidth={64} />
          </Svg>
        </Animated.View>

        {/* Shaft: the orbit is the outer view, so the shaft turns rigidly with
            it and its tip keeps pointing outward. The intro is the inner one. */}
        <Animated.View style={[layer, {
          transform: [
            { rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          ],
        }]}>
          <Animated.View style={[layer, {
            opacity: shaft.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateX: shaft.interpolate({ inputRange: [0, 1], outputRange: [300 * unit, 0] }) },
              { translateY: shaft.interpolate({ inputRange: [0, 1], outputRange: [-340 * unit, 0] }) },
              { rotate: shaft.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) },
              { scale: shaft.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
            ],
          }]}>
            <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
              <Path d={SHAFT} fill={ICON.shaft} />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>

      {showWordmark && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', gap: 7 }}>
          {LETTERS.map((letter, i) => (
            <Letter key={`${letter}-${i}`} letter={letter} delay={LETTER_DELAYS[i]}
              moving={moving}
              // The D is the one lime character, and only where lime has the
              // contrast for it: never on the light surface.
              color={i === LETTERS.length - 1 ? t.wordAccent : t.word} />
          ))}
        </View>
      )}

      <View style={{ position: 'absolute', bottom: 38, alignItems: 'center', gap: 16 }}>
        <View style={{ width: 118, height: 2, borderRadius: 2, backgroundColor: t.track, overflow: 'hidden' }}>
          <Animated.View style={{
            width: '45%',
            height: '100%',
            backgroundColor: t.bar,
            // -100% to 220% of the BAR's own width, which is 45% of the track.
            transform: [{ translateX: bar.interpolate({
              inputRange: [0, 1],
              outputRange: [-118 * 0.45, 118 * 0.45 * 2.2],
            }) }],
          }} />
        </View>
        <Text style={{
          // The app's own mono convention. The handoff asks for IBM Plex Mono,
          // which cannot be used here: this screen is what shows WHILE the
          // fonts load, so it can only rely on faces the platform already has.
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: 2,
          color: t.meta,
        }}>
          {label.toUpperCase()}
        </Text>
      </View>
    </Animated.View>
  );
}

function Letter({ letter, delay, color, moving }: {
  letter: string; delay: number; color: string; moving: boolean;
}) {
  const rise = useRef(new Animated.Value(moving ? 0 : 1)).current;
  useEffect(() => {
    if (!moving) return undefined;
    const run = Animated.timing(rise, {
      toValue: 1, duration: 500, delay, easing: RISE_EASE, useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [rise, delay, moving]);
  return (
    <Animated.Text style={{
      // Archivo 800 is the app's display face and is loaded by then: the
      // letters do not arrive until 1.15s, by which point the font wait is
      // normally over.
      fontFamily: 'Archivo_800ExtraBold',
      fontSize: 30,
      letterSpacing: 4.2,
      color,
      opacity: rise,
      transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
    }}>
      {letter}
    </Animated.Text>
  );
}

// The icon is the same in both themes; only the surface behind it changes.
//
// These are the handoff's values and they are NOT the app icon's: the shipped
// mark has a white ring at stroke 108, this one a charcoal ring at 64. The
// handoff flags its own charcoal as unconfirmed with brand, so the two are
// left to disagree here rather than one silently overwriting the other.
const ICON = { tile: '#0B0E11', ring: '#36454F', shaft: '#C8FF3D' };
const SHAFT = 'M540.6,419l209-209h97l-169,285-90,48-47-124Z';
