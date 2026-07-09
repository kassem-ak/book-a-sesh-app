import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Feather>['name'];
const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: 'discover', label: 'Discover', icon: 'search' },
  { key: 'community', label: 'Community', icon: 'users' },
  { key: 'shop', label: 'Shop', icon: 'shopping-bag' },
  { key: 'chat', label: 'Chat', icon: 'message-square' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

export function TabBar() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const tab = useStore((s) => s.tab);
  const setKey = useStore((s) => s.set);
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
      {TABS.map((item) => {
        const active = tab === item.key;
        return (
          <Pressable key={item.key} onPress={() => setKey('tab', item.key)} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Feather name={item.icon} size={23} color={active ? c.volt : c.txt3} />
            <Text style={[t.navLabel, { color: active ? c.volt : c.txt3 }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
