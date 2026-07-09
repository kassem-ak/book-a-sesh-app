import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Icon } from './ui';

// Full-screen overlay that slides up 14px + fades over 280ms (matches `ovUp`).
export function OverlayScaffold({
  header,
  children,
  bottomBar,
}: {
  header: ReactNode;
  children: ReactNode;
  bottomBar?: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: c.bg,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      <View style={{ paddingTop: insets.top }}>{header}</View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 22 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {bottomBar ? <View style={{ paddingBottom: insets.bottom }}>{bottomBar}</View> : null}
    </Animated.View>
  );
}

export function OverlayHeader({
  title,
  onBack,
  subtitle,
  trailing,
}: {
  title: string;
  onBack: () => void;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 }}>
      <Pressable
        onPress={onBack}
        style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={22} color={c.txt2} />
      </Pressable>
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={[t.overlayTitle, { color: c.txt }]}>{title}</Text>
        {subtitle ? <Text style={[t.caption, { color: c.txt3 }]}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}
