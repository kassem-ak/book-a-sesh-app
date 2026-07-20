import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ensureAppSession } from '../lib/session';
import { supabase } from '../lib/supabase';
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

  useEffect(() => {
    ensureAppSession().catch((error) => console.warn('Supabase session unavailable', error));
    // Mirror the real (non-anonymous) account into the store for the Profile UI.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      const real = user && !user.is_anonymous;
      useStore.getState().set('authEmail', real ? user.email ?? null : null);
      useStore.getState().set('authName', real ? (user.user_metadata?.name as string | undefined) ?? null : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
