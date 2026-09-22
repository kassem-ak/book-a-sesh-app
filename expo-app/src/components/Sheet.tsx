import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion, radii, useTheme } from '../theme';
import { Icon } from './ui';

// Bottom-sheet presentation layer — the second of the prototype's two layers
// (`sheet`: story, hours, pkg, myComm, admin). Distinct from OverlayScaffold:
// a sheet docks to the bottom over a scrim, is content-sized rather than
// full-screen, and dismisses when the scrim is tapped.
//
// Motion: slide up from the bottom + scrim fade, 250ms, native driver.
export function Sheet({
  title,
  onClose,
  children,
  footer,
  subtitle,
  maxHeightRatio = 0.85,
}: {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  /** Optional supporting line under the title (prototype `sheet.sub`). */
  subtitle?: string;
  /** Fraction of screen height the sheet may grow to. Default 0.85. */
  maxHeightRatio?: number;
}) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  // Panel height is unknown until layout; start the slide from a generous
  // offset and refine once measured so the panel is never visible mid-flight.
  const [panelH, setPanelH] = useState(screenH * maxHeightRatio);

  useEffect(() => {
    const a = Animated.timing(anim, {
      toValue: 1,
      duration: motion.sheet,
      useNativeDriver: true,
    });
    a.start();
    return () => {
      a.stop();
      anim.stopAnimation();
    };
  }, [anim]);

  const onPanelLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - panelH) > 1) setPanelH(h);
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
      {/* Scrim — tapping it dismisses. */}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: anim }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{ flex: 1, backgroundColor: c.scrim }}
        />
      </Animated.View>

      <Animated.View
        onLayout={onPanelLayout}
        style={{
          maxHeight: screenH * maxHeightRatio,
          backgroundColor: c.bg,
          borderTopLeftRadius: radii.sheet,
          borderTopRightRadius: radii.sheet,
          borderTopWidth: 1,
          borderColor: c.line,
          paddingTop: 20,
          paddingHorizontal: 18,
          paddingBottom: insets.bottom + 20,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [panelH, 0] }) },
          ],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={[t.overlayTitle, { color: c.txt }]}>{title}</Text>
            {subtitle ? (
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 3, fontSize: 12.5 }]}>{subtitle}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: c.surface,
              borderColor: c.line,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x" size={16} color={c.txt2} />
          </Pressable>
        </View>

        {children ? (
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingBottom: footer ? 16 : 0 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : null}

        {footer}
      </Animated.View>
    </View>
  );
}
