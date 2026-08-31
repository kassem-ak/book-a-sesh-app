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

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const goingDown = y > lastY.current + 4;
    const goingUp = y < lastY.current - 4;
    lastY.current = y;
    if (goingDown && shown.current) {
      shown.current = false;
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    } else if (goingUp && !shown.current) {
      shown.current = true;
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }
  };

  return { anim, onScroll };
}

export function ScrollAwareFab({
  anim,
  icon = 'plus',
  onPress,
}: {
  anim: Animated.Value;
  icon?: IconName;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: 18,
        bottom: 18,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      <Pressable
        onPress={onPress}
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
