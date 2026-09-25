import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmButton } from '../components/ItemMenu';
import { BrandMark, Button } from '../components/ui';
import { ensureAppSession, signOutUser } from '../lib/session';
import { identify } from '../lib/analytics';
import { fetchCoaches, fetchPartners } from '../lib/queries';
import { fetchVisibleModules } from '../lib/modules';
import { fetchGeoStatus } from '../lib/geolock';
import { applySignupProfile, fetchMyProfile } from '../lib/profiles';
import { registerPushToken } from '../lib/push';
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

// Both dead-end screens below offer the same escape hatch, so they ask the
// same question -- worded once so the two cannot drift apart.
const SIGN_OUT_CONFIRM = {
  title: 'Sign out?',
  body: 'You will need to sign in again to see your bookings and messages.',
  confirmLabel: 'Sign out',
};

const signOut = () => {
  void signOutUser().catch((error) => useStore.getState().set('writeError', errorMessage(error)));
};

export function Root() {
  assertSupabaseConfigured();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const tab = useStore((s) => s.tab);
  const overlay = useStore((s) => s.overlay);
  const sheet = useStore((s) => s.sheet);
  const authUid = useStore((s) => s.authUid);
  const profileRevision = useStore((s) => s.profileRevision);
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
        // Per-account, like the role beside it: the previous account's coaching
        // screens must not be on offer to the next one.
        state.set('isCoach', false);
        state.set('blockedIds', []);
        state.set('followedIds', []);
        state.set('overlay', null);
        state.set('sheet', null);
        // Everything below is per-account. Leaving it behind showed the new
        // account the previous one's communities and permissions until the
        // Community tab happened to rehydrate.
        state.set('joinedCommunities', []);
        state.set('joinedSubs', []);
        state.set('communityRoles', {});
        state.set('modules', []);
      }
      state.set('authEmail', real ? user.email ?? null : null);
      state.set('authUid', uid);
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
      // Without this the area only appears after an edit: the store starts
      // empty every launch, so Profile and Discover would show nothing for an
      // account that set its area on a previous run.
      state.set('authLoc', profile.city);
      if (applied) state.set('mode', profile.role === 'coach' ? 'partners' : 'coaches');
      identify(profile.id);
      await Promise.all([state.refreshRole(), state.refreshBlocked(), state.refreshCircle()]);
      // After the profile, because the token row points at the app user id.
      // Never awaited into the error path above: a declined permission prompt
      // is a choice, not a failure of the profile load.
      void registerPushToken(profile.id);
    })().catch((error) => { if (active) setProfileError(errorMessage(error)); });
    return () => { active = false; };
  }, [authUid, profileAttempt]);

  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const retryPeople = () => setLoadAttempt((attempt) => attempt + 1);
  const admitted = Boolean(authUid);
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

  // Whether the app operates where this device is connecting from. The server
  // enforces this on every data policy; asking here only lets us say so rather
  // than render screens that would all come back empty.
  const [geoBlocked, setGeoBlocked] = useState(false);
  useEffect(() => {
    if (!admitted) return;
    let active = true;
    fetchGeoStatus().then((status) => { if (active) setGeoBlocked(!status.allowed); });
    return () => { active = false; };
  }, [admitted, authUid, profileAttempt]);

  // Which modules this account may reach. Re-read when the account changes,
  // because an admin sees the testing releases an ordinary member does not.
  const modules = useStore((s) => s.modules);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [moduleAttempt, setModuleAttempt] = useState(0);
  useEffect(() => {
    if (!admitted) return;
    let active = true;
    setModulesLoaded(false);
    fetchVisibleModules().then((keys) => {
      if (!active) return;
      const state = useStore.getState();
      state.set('modules', keys);
      // A tab that is no longer released must not stay selected.
      if (!keys.includes(state.tab) && state.tab !== 'profile') {
        state.set('tab', keys[0] ?? '');
      }
      setModulesLoaded(true);
    });
    return () => { active = false; };
  }, [admitted, authUid, profileRevision, moduleAttempt]);
  const released = (key: string) => tab === key && modules.includes(key);

  // Landing gate. There is no guest tier: nothing in the app renders until a
  // registered account is signed in.
  if (!authUid) return <AuthLanding />;

  if (geoBlocked) return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        {/* The two screens with no header, no tab bar and no way onward. The
            mark is the only thing that says which app this is. */}
        <BrandMark size={44} />
        <Text accessibilityRole="header" style={{ color: c.txt, fontSize: 22, textAlign: 'center', marginTop: 18, marginBottom: 12 }}>
          BOOK'D is not available in your region yet
        </Text>
        <Text style={{ color: c.txt3, textAlign: 'center' }}>
          You're signed in. Access depends on the country your network connects from.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <Button label="Check again" icon="refresh-cw"
            onPress={() => {
              setProfileAttempt((attempt) => attempt + 1);
              retryPeople();
              setModuleAttempt((attempt) => attempt + 1);
            }} />
          <ConfirmButton label="Sign out" icon="log-out" confirm={SIGN_OUT_CONFIRM} onPress={signOut} />
        </View>
      </View>
      <ErrorBanner />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {profileError && <View style={{ padding: 12, gap: 10, alignItems: 'flex-start', backgroundColor: c.surface }}>
          <Text style={{ color: c.danger }}>Profile setup could not finish: {profileError}</Text>
          <Button label="Try again" icon="refresh-cw" tone="danger"
            accessibilityLabel="Retry saving your signup profile"
            onPress={() => setProfileAttempt(profileAttempt + 1)} />
        </View>}
        {/* Rendering is gated on the same server answer as the tab bar, so a
            stale `tab` value from a module withdrawn mid-session cannot keep
            the screen on screen. */}
        {released('discover') && <DiscoverScreen loadError={peopleError} onRetry={retryPeople} />}
        {released('maps') && <MapsScreen loadError={peopleError} onRetry={retryPeople} />}
        {released('courts') && <CourtsScreen />}
        {released('community') && <CommunityScreen />}
        {released('chat') && <ChatScreen />}
        {/* Off-nav destination: Profile opens from the header person icon.
            The Shop section is parked — its screens and overlays are still
            in the tree, just unreachable until it comes back. */}
        {tab === 'profile' && <ProfileScreen />}
        {/* Every module withdrawn, or the lookup failed. Saying so beats a
            blank screen that looks like a crash. */}
        {modulesLoaded && modules.length === 0 && tab !== 'profile' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <BrandMark size={40} />
            <Text style={{ color: c.txt, fontSize: 17, textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
              Nothing to show yet
            </Text>
            <Text style={{ color: c.txt3, textAlign: 'center' }}>
              No sections have been released to your account, or they could not be checked.
            </Text>
            {/* With no module released the tab bar renders nothing and no
                screen renders its header, so these two buttons are the only
                way out. Without them this state is a dead end: Profile is not
                offered because it draws no header of its own and would be a
                second trap. */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <Button label="Check again" icon="refresh-cw"
                onPress={() => setModuleAttempt(moduleAttempt + 1)} />
              <ConfirmButton label="Sign out" icon="log-out" confirm={SIGN_OUT_CONFIRM} onPress={signOut} />
            </View>
          </View>
        )}
      </View>
      <TabBar />
      {overlay ? <OverlayRouter id={overlay} /> : null}
      {/* handoff v2: bottom sheets sit above overlays */}
      {sheet ? <SheetRouter id={sheet} /> : null}
      <ErrorBanner />
    </View>
  );
}
