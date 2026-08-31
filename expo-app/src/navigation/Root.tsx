import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ensureAppSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { useStore } from '../state/store';
import { useTheme } from '../theme';
import { AuthLanding } from '../screens/AuthLanding';
import { ChatScreen } from '../screens/ChatScreen';
import { CourtsScreen } from '../screens/CourtsScreen';
import { MapsScreen } from '../screens/MapsScreen';
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
  const authEmail = useStore((s) => s.authEmail);
  const guestMode = useStore((s) => s.guestMode);

  useEffect(() => {
    ensureAppSession().catch((error) => console.warn('Supabase session unavailable', error));
    // Mirror the real (non-anonymous) account into the store for the Profile UI.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      const real = user && !user.is_anonymous;
      useStore.getState().set('authEmail', real ? user.email ?? null : null);
      useStore.getState().set('authName', real ? (user.user_metadata?.name as string | undefined) ?? null : null);
      // Signing out of a real account returns to the landing gate.
      if (event === 'SIGNED_OUT') useStore.getState().set('guestMode', false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Landing gate: no real account and guest mode not chosen yet.
  if (!authEmail && !guestMode) return <AuthLanding />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {tab === 'discover' && <DiscoverScreen />}
        {tab === 'maps' && <MapsScreen />}
        {tab === 'courts' && <CourtsScreen />}
        {tab === 'community' && <CommunityScreen />}
        {tab === 'chat' && <ChatScreen />}
        {/* Off-nav destinations: Profile opens from the header person icon,
            Shop is retained for the second release. */}
        {tab === 'profile' && <ProfileScreen />}
        {tab === 'shop' && <ShopScreen />}
      </View>
      <TabBar />
      {overlay ? <OverlayRouter id={overlay} /> : null}
    </View>
  );
}
