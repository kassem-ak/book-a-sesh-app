import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ensureAppSession } from '../lib/session';
import { identify } from '../lib/analytics';
import { fetchCoaches, fetchPartners } from '../lib/queries';
import { applySignupProfile, fetchMyProfile } from '../lib/profiles';
import { assertSupabaseConfigured, supabase } from '../lib/supabase';
import { errorMessage, useStore } from '../state/store';
import { useTheme } from '../theme';
import { ErrorBanner } from '../components/ErrorBanner';
import { AuthLanding } from '../screens/AuthLanding';
import { ChatScreen } from '../screens/ChatScreen';
import { CourtsScreen } from '../screens/CourtsScreen';
import { MapsScreen } from '../screens/MapsScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OverlayRouter } from './OverlayRouter';
import { SheetRouter } from './SheetRouter';
import { TabBar } from './TabBar';

export function Root() {
  assertSupabaseConfigured();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const tab = useStore((s) => s.tab);
  const overlay = useStore((s) => s.overlay);
  const sheet = useStore((s) => s.sheet);
  const authUid = useStore((s) => s.authUid);
  const profileRevision = useStore((s) => s.profileRevision);
  const guestMode = useStore((s) => s.guestMode);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileAttempt, setProfileAttempt] = useState(0);

  useEffect(() => {
    ensureAppSession()
      .catch((error) => console.warn('Supabase session unavailable', error));
    // Mirror the real (non-anonymous) account into the store for the Profile UI.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      const real = user && !user.is_anonymous;
      const state = useStore.getState();
      const wasReal = Boolean(state.authUid);
      const uid = real ? user.id : null;
      if (state.authUid !== uid) {
        identify(null);
        state.set('authName', real ? (user.user_metadata?.name as string | undefined) ?? null : null);
        state.set('authAvatarUrl', null);
        state.set('authUserId', null);
        state.set('role', 'USER');
        state.set('blockedIds', []);
        state.set('overlay', null);
        state.set('sheet', null);
      }
      state.set('authEmail', real ? user.email ?? null : null);
      state.set('authUid', uid);
      // Signing out of a real account returns to the landing gate.
      if (event === 'SIGNED_OUT' && wasReal) state.set('guestMode', false);
      // Database/auth calls run in the effect below, outside Supabase's auth
      // callback lock. Awaiting them here can deadlock the SSO round-trip.
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    setProfileError(null);
    if (!authUid) return;
    void (async () => {
      const applied = await applySignupProfile(authUid);
      if (!active) return;
      if (applied) {
        const state = useStore.getState();
        state.set('signupIntent', null);
        state.set('signupSports', []);
        state.set('profileRevision', state.profileRevision + 1);
        state.set('overlay', 'editProfile');
      }
      const profile = await fetchMyProfile();
      if (!active) return;
      const state = useStore.getState();
      state.set('authName', profile.name);
      state.set('authAvatarUrl', profile.avatarUrl);
      state.set('authUserId', profile.id);
      if (applied) state.set('mode', profile.role === 'coach' ? 'partners' : 'coaches');
      identify(profile.id);
      await Promise.all([state.refreshRole(), state.refreshBlocked()]);
    })().catch((error) => { if (active) setProfileError(errorMessage(error)); });
    return () => { active = false; };
  }, [authUid, profileAttempt]);

  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const retryPeople = () => setLoadAttempt((attempt) => attempt + 1);
  const admitted = Boolean(authUid || guestMode);
  useEffect(() => {
    if (!admitted) return;
    let active = true;
    const state = useStore.getState();
    state.set('loaded', { ...state.loaded, people: false });
    setPeopleError(null);
    Promise.allSettled([fetchCoaches(), fetchPartners()]).then((results) => {
      if (!active) return;
      const state = useStore.getState();
      state.setRemotePeople(results.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
      if (results.some((result) => result.status === 'rejected')) {
        setPeopleError('Some profiles could not load. Please try again.');
      }
    });
    return () => { active = false; };
  }, [admitted, authUid, profileRevision, loadAttempt]);

  // Landing gate: no real account and guest mode not chosen yet.
  if (!authUid && !guestMode) return <AuthLanding />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {profileError && <Pressable accessibilityRole="button" accessibilityLabel="Retry saving your signup profile"
          onPress={() => setProfileAttempt(profileAttempt + 1)} style={{ minHeight: 44, padding: 12, backgroundColor: c.surface }}>
          <Text style={{ color: c.danger }}>Profile setup could not finish: {profileError} Tap to retry.</Text>
        </Pressable>}
        {tab === 'discover' && <DiscoverScreen loadError={peopleError} onRetry={retryPeople} />}
        {tab === 'maps' && <MapsScreen loadError={peopleError} onRetry={retryPeople} />}
        {tab === 'courts' && <CourtsScreen />}
        {tab === 'community' && <CommunityScreen />}
        {tab === 'chat' && <ChatScreen />}
        {/* Off-nav destination: Profile opens from the header person icon.
            The Shop section is parked — its screens and overlays are still
            in the tree, just unreachable until it comes back. */}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      <TabBar />
      {overlay ? <OverlayRouter id={overlay} /> : null}
      {/* handoff v2: bottom sheets sit above overlays */}
      {sheet ? <SheetRouter id={sheet} /> : null}
      <ErrorBanner />
    </View>
  );
}
