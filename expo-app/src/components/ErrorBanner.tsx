import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';
import { Icon, Row } from './ui';

// Every store write records failures in `writeError`, but nothing rendered it —
// a failed booking or checkout looked like a dead button. This surfaces it.
export function ErrorBanner() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const error = useStore((s) => s.writeError);
  const setKey = useStore((s) => s.set);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: error ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    if (!error) return;
    const timer = setTimeout(() => setKey('writeError', null), 6000);
    return () => clearTimeout(timer);
  }, [error, anim, setKey]);

  if (!error) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: insets.bottom + 86,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <Pressable
        onPress={() => setKey('writeError', null)}
        accessibilityRole="alert"
        accessibilityLabel={`Error: ${error}. Tap to dismiss.`}
        style={{
          backgroundColor: alpha(c.danger, 0.16),
          borderColor: alpha(c.danger, 0.45),
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Row gap={10}>
          <Icon name="alert-circle" size={17} color={c.danger} />
          <Text style={[t.bodySm, { color: c.danger, flex: 1 }]} numberOfLines={3}>
            {friendly(error)}
          </Text>
          <Icon name="x" size={15} color={c.danger} />
        </Row>
      </Pressable>
    </Animated.View>
  );
}

// Raw Postgres/PostgREST text is not user-facing copy; translate the ones we
// actually raise and fall back to a generic line.
function friendly(raw: string) {
  const m = raw.toLowerCase();
  if (m.includes('not authorized to manage')) return "You don't have permission to manage this community.";
  if (m.includes('join this community')) return 'Join this community before suggesting events.';
  if (m.includes('signed-in app user required')) return 'Sign in to continue.';
  if (m.includes('invalid input syntax for type uuid')) return 'This demo item is not backed by live data yet.';
  if (m.includes('must keep at least one owner')) return 'A community needs at least one owner — transfer ownership first.';
  if (m.includes('already handled')) return 'That suggestion was already reviewed.';
  if (m.includes('network') || m.includes('fetch')) return 'Network problem — check your connection and try again.';
  return raw.length > 140 ? 'Something went wrong. Please try again.' : raw;
}
