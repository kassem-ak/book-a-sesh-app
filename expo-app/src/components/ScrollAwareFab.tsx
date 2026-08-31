import React, { useRef } from 'react';
import { Animated, NativeScrollEvent, NativeSyntheticEvent, Pressable } from 'react-native';
import { Icon } from './ui';
import { useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Icon>['name'];

// Board annotation: "Icon Disappears when scrolling Down and appears when
// scrolling up". Returns the FAB plus the scroll handler that drives it.
export function useScrollAwareFab() {
  const anim = useRef(new Animated.Value(1)).current;
  const lastY = useRef(0);
  const shown = useRef(true);
  const [visible, setVisible] = React.useState(true);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const goingDown = y > lastY.current + 4;
    const goingUp = y < lastY.current - 4;
    lastY.current = y;
    if (goingDown && shown.current) {
      shown.current = false;
      setVisible(false);
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    } else if (goingUp && !shown.current) {
      shown.current = true;
      setVisible(true);
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }
  };

  return { anim, onScroll, visible };
}

export function ScrollAwareFab({
  anim,
  icon = 'plus',
  onPress,
  visible = true,
  label = 'Add',
}: {
  anim?: Animated.Value;
  icon?: IconName;
  onPress?: () => void;
  visible?: boolean;
  label?: string;
}) {
  const { c } = useTheme();
  // tabs that do not hide the FAB pass no anim; fall back to a static value
  const fallback = useRef(new Animated.Value(1)).current;
  const value = anim ?? fallback;
  return (
    <Animated.View
      // a hidden (opacity 0) FAB must not keep stealing taps
      pointerEvents={visible ? 'box-none' : 'none'}
      style={{
        position: 'absolute',
        right: 18,
        bottom: 18,
        opacity: value,
        transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: c.volt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={22} color={c.ink} />
      </Pressable>
    </Animated.View>
  );
}
