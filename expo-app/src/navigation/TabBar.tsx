import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Feather>['name'];
// First release ships Discover · Maps · Community · Chat.
// Courts and Shop are both SECOND RELEASE: the Courts screens, data layer and
// reserve_court money path are built and live, just not reachable from the nav
// yet, so re-adding the entry below is all it takes to ship them.
// Profile lives on the header person icon rather than the tab bar.
const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: 'discover', label: 'Discover', icon: 'search' },
  { key: 'maps', label: 'Maps', icon: 'map' },
  { key: 'community', label: 'Community', icon: 'share-2' },
  { key: 'chat', label: 'Chat', icon: 'message-square' },
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
          <Pressable
            key={item.key}
            onPress={() => setKey('tab', item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <Feather name={item.icon} size={23} color={active ? c.volt : c.txt3} />
            <Text style={[t.navLabel, { color: active ? c.volt : c.txt3 }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
