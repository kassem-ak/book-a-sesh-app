import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { SportsPicker } from '../components/SportsPicker';
import { Avatar, Field, Row, SectionHeading, VoltButton } from '../components/ui';
import { pickAvatar, PickedAvatar, uploadAvatar } from '../lib/avatars';
import { fetchMyProfile, Profile, saveMyProfile, shareMyLocation, stopSharingMyLocation } from '../lib/profiles';
import { refreshDevicePoint } from '../lib/geo';
import { initials } from '../state/models';
import { errorMessage, useStore } from '../state/store';
import { useTheme } from '../theme';

export function EditProfileOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photo, setPhoto] = useState<PickedAvatar | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(null);
    setProfile(null);
    fetchMyProfile().then((value) => { if (active) setProfile(value); })
      .catch((e) => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [attempt, s.authUid]);
  const choosePhoto = async () => {
    if (picking || saving.current) return;
    setPicking(true);
    setError(null);
    try {
      const picked = await pickAvatar();
      if (picked) setPhoto(picked);
    } catch (e) { setError(errorMessage(e)); }
    finally { setPicking(false); }
  };
  // Sharing is written immediately rather than on Save: it is a permission
  // decision, and a prompt answered now that silently does nothing until a
  // later Save would be a worse thing to be wrong about.
  const useMyLocation = async () => {
    if (locating || saving.current) return;
    setLocating(true);
    setError(null);
    try {
      const point = await refreshDevicePoint();
      if (!point) {
        setError('Location is unavailable. Allow location for BOOK’D in your device settings, or type your area instead.');
        return;
      }
      await shareMyLocation(point);
      setProfile((current) => (current ? { ...current, sharesLocation: true } : current));
    } catch (e) { setError(errorMessage(e)); }
    finally { setLocating(false); }
  };

  const stopSharing = async () => {
    if (locating || saving.current) return;
    setLocating(true);
    setError(null);
    try {
      await stopSharingMyLocation();
      setProfile((current) => (current ? { ...current, sharesLocation: false } : current));
    } catch (e) { setError(errorMessage(e)); }
    finally { setLocating(false); }
  };

  const save = async () => {
    if (!profile || saving.current || picking) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await saveMyProfile(profile);
      const avatarUrl = photo ? await uploadAvatar(photo, profile.id) : profile.avatarUrl;
      const state = useStore.getState();
      if (state.authUid !== s.authUid) return;
      state.set('authName', profile.name.trim());
      state.set('authAvatarUrl', avatarUrl);
      state.set('authLoc', profile.city.trim());
      state.set('profileRevision', state.profileRevision + 1);
      await state.refreshRole();
      state.closeOverlay();
    } catch (e) {
      // Writes span tables/storage, so keep the draft visible and retryable.
      setError(`Some profile changes may already be saved. ${errorMessage(e)} Retry to finish saving.`);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <OverlayScaffold header={<OverlayHeader title="Edit profile" subtitle="Free for coaches and members" onBack={() => { if (!busy && !picking) s.closeOverlay(); }} />}
      bottomBar={profile ? <View style={{ padding: 16 }}>
        <VoltButton label="Save profile" busy={busy} busyLabel="Saving…" enabled={!!profile.name.trim() && !picking && !locating} onPress={() => void save()} />
      </View> : undefined}>
      <View style={{ paddingHorizontal: 18, gap: 16 }}>
        {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
        {!profile && (error ? <VoltButton label="Retry loading profile" onPress={() => setAttempt(attempt + 1)} />
          : <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt2 }]}>Loading profile…</Text>)}
        {profile && <View pointerEvents={busy ? 'none' : 'auto'} accessibilityElementsHidden={busy} importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'} style={{ gap: 16 }}>
          <Row gap={16}>
            <Avatar initials={initials(profile.name)} avatarUrl={photo?.uri ?? profile.avatarUrl} size={72} radius={20} />
            <Pressable onPress={() => void choosePhoto()} disabled={picking || busy} accessibilityRole="button"
              accessibilityLabel="Choose profile photo" accessibilityState={{ disabled: picking || busy, busy: picking }} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={[t.label, { color: c.accent }]}>{picking ? 'Opening photos…' : 'Choose photo'}</Text>
            </Pressable>
          </Row>
          <Text style={[t.caption, { color: c.txt3 }]}>JPEG, PNG, WebP or HEIC · maximum 2 MiB. Your profile photo is public.</Text>
          <SectionHeading>Display name</SectionHeading>
          <Field value={profile.name} onChange={(name) => setProfile({ ...profile, name })} placeholder="Your name" label="Display name" />
          <SectionHeading>Area</SectionHeading>
          <Field value={profile.city} onChange={(city) => setProfile({ ...profile, city })}
            placeholder="Where you train" label="Your area" />
          <Text style={[t.caption, { color: c.txt3 }]}>Shown on your profile so people can find you nearby.</Text>

          <SectionHeading>Current location</SectionHeading>
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            {profile.sharesLocation
              ? 'Your approximate location is saved, so people can see how far away you are. Your exact position is never shown, and nobody can read your coordinates.'
              : 'Optional. Share your approximate location and BOOK’D can sort people and venues by distance from you. You can stop at any time.'}
          </Text>
          <Row gap={16}>
            <Pressable onPress={() => void useMyLocation()} disabled={locating || busy} accessibilityRole="button"
              accessibilityLabel={profile.sharesLocation ? 'Update your current location' : 'Use your current location'}
              accessibilityState={{ disabled: locating || busy, busy: locating }} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={[t.label, { color: c.accent }]}>
                {locating ? 'Checking location…' : profile.sharesLocation ? 'Update location' : 'Use my current location'}
              </Text>
            </Pressable>
            {profile.sharesLocation && (
              <Pressable onPress={() => void stopSharing()} disabled={locating || busy} accessibilityRole="button"
                accessibilityLabel="Stop sharing your location"
                accessibilityState={{ disabled: locating || busy }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[t.label, { color: c.danger }]}>Stop sharing</Text>
              </Pressable>
            )}
          </Row>

          <SectionHeading>Bio</SectionHeading>
          <TextInput value={profile.bio} onChangeText={(bio) => setProfile({ ...profile, bio })} multiline accessibilityLabel="Bio"
            placeholder="Tell people about yourself" placeholderTextColor={c.txt3} textAlignVertical="top"
            style={[t.body, { color: c.txt, minHeight: 100, borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.surface, padding: 14 }]} />
          {profile.role === 'coach' && <>
            <SectionHeading>Headline</SectionHeading>
            <Field value={profile.headline} onChange={(headline) => setProfile({ ...profile, headline })} placeholder="What you teach" label="Coach headline" />
            <SectionHeading>Level</SectionHeading>
            <Field value={profile.level} onChange={(level) => setProfile({ ...profile, level })} placeholder="Describe your coaching level" label="Coach level" />
          </>}
          <SectionHeading>{profile.role === 'coach' ? 'Profession · primary sport or hobby' : 'Interests'}</SectionHeading>
          <SportsPicker selected={profile.sportIds} onChange={(sportIds) => setProfile({ ...profile, sportIds })} coach={profile.role === 'coach'} />
          <Text style={[t.caption, { color: c.txt3 }]}>You can return to Profile → Edit profile at any time.</Text>
        </View>}
      </View>
    </OverlayScaffold>
  );
}
