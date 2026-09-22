import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Feather>['name'];
// Every module the app can render. Which of these a given account actually
// sees is decided by the server, not by this list and not by the build: the
// web admin console releases a module to admins first and then to everyone.
// A key missing from the server's answer is hidden, so adding an entry here
// ships the code without exposing the screen.
// Profile lives on the header person icon rather than the tab bar.
const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: 'discover', label: 'Discover', icon: 'search' },
  { key: 'maps', label: 'Maps', icon: 'map' },
  { key: 'community', label: 'Community', icon: 'share-2' },
  { key: 'chat', label: 'Chat', icon: 'message-square' },
  { key: 'courts', label: 'Courts', icon: 'calendar' },
  { key: 'shop', label: 'Shop', icon: 'shopping-bag' },
];

export function TabBar() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const tab = useStore((s) => s.tab);
  const modules = useStore((s) => s.modules);
  const setKey = useStore((s) => s.set);
  const visible = TABS.filter((item) => modules.includes(item.key));
  // Nothing released yet, or the lookup failed: render no tab bar rather than
  // guessing. Guessing here would be guessing in the unsafe direction.
  if (visible.length === 0) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.nav,
        borderTopColor: c.line,
        borderTopWidth: 1,
        paddingTop: 8,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
      }}
    >
      {visible.map((item) => {
        const active = tab === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => setKey('tab', item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <Feather name={item.icon} size={23} color={active ? c.accent : c.txt3} />
            <Text style={[t.navLabel, { color: active ? c.accent : c.txt3 }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
