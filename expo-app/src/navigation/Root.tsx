import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../state/store';
import { useTheme } from '../theme';
import { ChatScreen } from '../screens/ChatScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { OverlayRouter } from './OverlayRouter';
import { TabBar } from './TabBar';

export function Root() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const tab = useStore((s) => s.tab);
  const overlay = useStore((s) => s.overlay);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {tab === 'discover' && <DiscoverScreen />}
        {tab === 'community' && <CommunityScreen />}
        {tab === 'shop' && <ShopScreen />}
        {tab === 'chat' && <ChatScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      <TabBar />
      {overlay ? <OverlayRouter id={overlay} /> : null}
    </View>
  );
}
