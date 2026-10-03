import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Unlock with Face ID, Touch ID or a fingerprint.
//
// Not a second way to sign in. The account still signs in with its provider or
// its password, once; the session then stays on the device as it always has.
// What this adds is a lock in front of that session: when the app opens, the
// person holding the phone proves they are its owner before anything shows.
//
// That is the honest shape of "biometric login" on top of Supabase Auth. A
// fingerprint never leaves the device -- the OS answers yes or no -- so it
// cannot be a credential the server checks. It can only guard a credential the
// device already holds.
//
// Native only. The browser has no equivalent short of passkeys, which were
// decided against, so on the web the setting is not offered at all.
//
// The choice is stored per account and per device: turning it on for your
// phone does not lock somebody else's account on the same phone, and does not
// follow you to a tablet that has no fingerprint enrolled.

type LocalAuth = typeof import('expo-local-authentication');

// Required lazily, like expo-location in geo.ts: the web bundle must never
// evaluate a native module it cannot use.
function localAuth(): LocalAuth | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-local-authentication') as LocalAuth;
  } catch {
    return null;
  }
}

const key = (authUid: string) => `bookd.biometric.${authUid}`;

/** Whether this device can do it right now: it has the hardware AND somebody
 *  has enrolled a face or finger. Hardware alone is not enough -- prompting
 *  on a phone with nothing enrolled fails every time. */
export async function biometricAvailable(): Promise<boolean> {
  const auth = localAuth();
  if (!auth) return false;
  try {
    return (await auth.hasHardwareAsync()) && (await auth.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** What to call it in the UI: "Face ID" on a phone with a face sensor,
 *  "fingerprint" with a finger sensor, otherwise the general word. */
export async function biometricLabel(): Promise<string> {
  const auth = localAuth();
  if (!auth) return 'biometrics';
  try {
    const types = await auth.supportedAuthenticationTypesAsync();
    if (types.includes(auth.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'face unlock';
    }
    if (types.includes(auth.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'fingerprint';
    }
  } catch { /* fall through */ }
  return 'biometrics';
}

export async function biometricEnabled(authUid: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(authUid))) === 'on';
  } catch {
    return false;
  }
}

/** Ask the OS. The device passcode is allowed as a fallback, as every banking
 *  app does: a cut finger or a mask must not lock the owner out of their own
 *  account -- the passcode proves ownership just as well. */
export async function unlockWithBiometrics(): Promise<boolean> {
  const auth = localAuth();
  if (!auth) return false;
  try {
    const result = await auth.authenticateAsync({
      promptMessage: "Unlock BOOK'D",
      cancelLabel: 'Not now',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

/** Turn it on or off. Turning it ON asks for a successful unlock first, so it
 *  can never be switched on by somebody who could not then open the app --
 *  which would lock the owner out on the next launch. Turning it off asks
 *  nothing: it only removes a lock. */
export async function setBiometric(authUid: string, on: boolean): Promise<boolean> {
  if (on) {
    if (!(await biometricAvailable())) return false;
    if (!(await unlockWithBiometrics())) return false;
    await AsyncStorage.setItem(key(authUid), 'on');
    return true;
  }
  await AsyncStorage.removeItem(key(authUid));
  return true;
}
