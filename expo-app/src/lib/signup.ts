import AsyncStorage from '@react-native-async-storage/async-storage';

export type SignupRole = 'coach' | 'member';
export type SignupDraft = { role: SignupRole; sportIds: string[]; email?: string; authUid?: string };
const KEY = 'bookd.signup';

export async function readSignupDraft(): Promise<SignupDraft | null> {
  const value = await AsyncStorage.getItem(KEY);
  return value ? JSON.parse(value) as SignupDraft : null;
}

export async function saveSignupDraft(draft: SignupDraft) {
  // Persist before leaving for SSO or waiting for an email confirmation.
  await AsyncStorage.setItem(KEY, JSON.stringify(draft));
}

export async function bindSignupEmail(email: string) {
  const draft = await readSignupDraft();
  if (draft && !draft.authUid && !draft.email) {
    await saveSignupDraft({ ...draft, email: email.trim().toLowerCase() });
  }
}

export async function clearSignupDraft() {
  await AsyncStorage.removeItem(KEY);
}
