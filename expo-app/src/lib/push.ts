import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Push registration.
//
// Native only. Expo's push service delivers through APNs and FCM; the web build
// would need a service worker and VAPID keys, which is a different mechanism
// with a different consent model, so the web app simply keeps its in-app inbox.
//
// Everything here fails quietly. A person who says no to the permission prompt,
// a simulator with no push capability, a build made before the EAS project id
// existed -- none of those are errors the user needs to see. The notification
// still arrives in the inbox; only the buzz is missing.

const CHANNEL = 'default';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

// How a notification behaves while the app is open. Banner and list, no sound:
// the person is already looking at the app, and a chime for a message they can
// see on screen is the kind of thing that makes people turn push off.
//
// Set behind the platform check so importing this module on web never reaches
// into a native module that is not there.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Written by `eas init`. Without it Expo cannot issue a token, so push stays
 *  off until the project is linked -- which is why this returns rather than
 *  throwing. */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

/**
 * Registers this device for the signed-in account.
 *
 * Takes the app user id rather than looking it up: the caller has just loaded
 * the profile, and importing the lookup would close a cycle
 * (session -> push -> bookings -> session) whose resolution order Metro does
 * not guarantee. The row is keyed by token, so the
 * upsert also covers the case that matters most: the same device signing in as
 * a different account. Without it the old row would still be there and the
 * previous account's notifications would keep arriving on this phone.
 */
export async function registerPushToken(appUserId: string): Promise<boolean> {
  if (!supported) return false;
  const id = projectId();
  if (!id) return false;

  try {
    // Android delivers nothing without a channel, and the one named here is the
    // one the Edge Function sends to.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // Ask only if not already answered. Calling request every launch re-prompts
    // on Android 13+ and is the fastest way to get permanently denied.
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return false;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (!token) return false;

    const { error } = await supabase.from('push_tokens').upsert(
      { token, user_id: appUserId, platform: Platform.OS, last_seen_at: new Date().toISOString() },
      { onConflict: 'token' },
    );
    if (error) throw error;
    return true;
  } catch (error) {
    // Deliberately not surfaced. The inbox works either way.
    console.warn('Push registration skipped', error);
    return false;
  }
}

/**
 * Releases this device before signing out.
 *
 * Has to happen while the session is still alive: the delete is gated by
 * `user_id = current_app_user()`, so after `signOut` there is no way to remove
 * it -- and the next person to sign in on this phone would receive the previous
 * account's notifications.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!supported) return;
  const id = projectId();
  if (!id) return;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (!existing.granted) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (!token) return;
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch (error) {
    console.warn('Push token not released', error);
  }
}
