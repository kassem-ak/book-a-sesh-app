import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Certificates } from '../components/Certificates';
import { ConfirmButton } from '../components/ItemMenu';
import { SocialFields } from '../components/SocialLinks';
import { SportsPicker } from '../components/SportsPicker';
import {
  Avatar, Button, Field, FormSheet, Row, SectionHeading, VoltButton,
} from '../components/ui';
import { pickAvatar, PickedAvatar, uploadAvatar } from '../lib/avatars';
import { analyticsErrorCode, track } from '../lib/analytics';
import { confirmsDeletion, deleteAccount, DELETE_WORD } from '../lib/session';
import { fetchMyProfile, Profile, saveMyProfile, setMyArea, setMyShareLevel, ShareLevel, shareMyLocation, stopSharingMyLocation } from '../lib/profiles';
import { describePoint, refreshDevicePoint } from '../lib/geo';
import { initials } from '../state/models';
import { errorMessage, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

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
  // Deleting an account cannot be undone, so it asks for the word rather than a
  // second tap. A tap is something a thumb does by accident; typing a word is
  // not. See DELETE_WORD below.
  const [deleteWord, setDeleteWord] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmed = confirmsDeletion(deleteWord);
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
  const useMyLocation = async (level: ShareLevel) => {
    if (locating || saving.current) return;
    setLocating(true);
    setError(null);
    try {
      const point = await refreshDevicePoint(level === 'exact');
      if (!point) {
        setError('Location is unavailable. Allow location for BOOK’D in your device settings, or type your area instead.');
        return;
      }
      await shareMyLocation(point, level);
      setProfile((current) => (current ? { ...current, sharesLocation: true, shareLevel: level } : current));

      // Name the place the person just agreed to share. Written straight away
      // for the same reason the position is: both came from one decision, and
      // a profile claiming one area while the map shows another is worse than
      // either alone. It stays an ordinary editable field afterwards.
      const area = await describePoint(point);
      if (area) {
        await setMyArea(area);
        setProfile((current) => (current ? { ...current, city: area } : current));
        useStore.getState().set('authLoc', area);
      }
    } catch (e) { setError(errorMessage(e)); }
    finally { setLocating(false); }
  };

  const changeLevel = async (level: ShareLevel) => {
    if (locating || saving.current || !profile) return;
    if (!profile.sharesLocation) return useMyLocation(level);
    // Already sharing: 'exact' needs a position the coarse permission may never
    // have produced, so re-capture rather than promoting a ~1 km reading to a
    // pin and calling it precise.
    if (level === 'exact') return useMyLocation(level);
    setLocating(true);
    setError(null);
    try {
      await setMyShareLevel(level);
      setProfile((current) => (current ? { ...current, shareLevel: level } : current));
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

  const removeAccount = async () => {
    if (deleting || busy || picking) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      // Nothing to close: the session is gone, so Root swaps the whole app back
      // to the landing gate on its own.
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
      setDeleting(false);
      // The sheet stays open: the error is in it, and closing would hide the
      // only explanation of what went wrong.
    }
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
      bottomBar={profile ? <View style={{ padding: 16, gap: 10 }}>
        {/* Beside the button that caused it. The copy at the top of the form
            stays for the load failure, which is a different thing. */}
        {error && (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive"
            style={[t.bodySm, { color: c.danger }]}>{error}</Text>
        )}
        <VoltButton label="Save profile" icon="check" busy={busy} busyLabel="Saving…" enabled={!!profile.name.trim() && !picking && !locating} onPress={() => void save()} />
      </View> : undefined}>
      <View style={{ paddingHorizontal: 18, gap: 16 }}>
        {!profile && error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
        {!profile && (error ? <Button label="Try again" icon="refresh-cw" tone="danger"
          accessibilityLabel="Retry loading your profile" onPress={() => setAttempt(attempt + 1)} />
          : <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt2 }]}>Loading profile…</Text>)}
        {profile && <View pointerEvents={busy ? 'none' : 'auto'} accessibilityElementsHidden={busy} importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'} style={{ gap: 16 }}>
          <Row gap={16}>
            <Avatar initials={initials(profile.name)} avatarUrl={photo?.uri ?? profile.avatarUrl} size={72} radius={20} />
            <Button label="Choose photo" icon="image" enabled={!picking && !busy}
              busy={picking} busyLabel="Opening photos…"
              accessibilityLabel="Choose profile photo" onPress={() => void choosePhoto()} />
          </Row>
          <Text style={[t.caption, { color: c.txt3 }]}>JPEG, PNG, WebP or HEIC · maximum 2 MiB. Your profile photo is public.</Text>
          <SectionHeading>Display name</SectionHeading>
          <Field value={profile.name} onChange={(name) => setProfile({ ...profile, name })} placeholder="Your name" label="Display name" />

          <SectionHeading>Bio</SectionHeading>
          <TextInput value={profile.bio} onChangeText={(bio) => setProfile({ ...profile, bio })} multiline accessibilityLabel="Bio"
            placeholder="Tell people about yourself" placeholderTextColor={c.txt3} textAlignVertical="top"
            style={[t.body, { color: c.txt, minHeight: 100, borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.surface, padding: 14 }]} />

          {/* With the bio, not in a group of their own: the name, the words and
              the accounts are the same answer to "who is this". */}
          <SectionHeading>Find me on</SectionHeading>
          <SocialFields
            value={profile.socials}
            disabled={busy}
            onChange={(socials) => setProfile({ ...profile, socials })}
          />

          {/* Group two: where you are. The area box and the map switch describe
              one thing between them, and the area is filled in from the very
              permission granted below it -- they were three screens apart. */}
          <GroupRule label="Where you train" />
          <SectionHeading>Area</SectionHeading>
          <Field value={profile.city} onChange={(city) => setProfile({ ...profile, city })}
            placeholder="Where you train" label="Your area" />
          <Text style={[t.caption, { color: c.txt3 }]}>
            Shown on your profile so people can find you nearby. Filled in for you from your
            location below — edit it if you would rather say something else.
          </Text>

          <SectionHeading>Location on the map</SectionHeading>
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            {profile.sharesLocation
              ? profile.shareLevel === 'exact'
                ? 'Other members see a pin at your location, and how far away you are.'
                : 'Other members see the area you are in, rounded to about a kilometre — not your exact position.'
              : 'Optional. You are not on the map. Share your location and BOOK’D can show you nearby people and sort by distance.'}
          </Text>
          <Text style={[t.caption, { color: c.txt3 }]}>
            Either choice puts you where you really are — BOOK’D never invents a fake nearby spot. You can change or stop this at any time, and blocked members never see you.
          </Text>
          {([
            { level: 'area' as ShareLevel, title: 'Approximate area', body: 'Rounded to about 1 km. Good enough for distance, not enough to find you.' },
            { level: 'exact' as ShareLevel, title: 'Pin point', body: 'Your position as your device reports it. Needs precise location permission.' },
          ]).map((option) => {
            const active = profile.sharesLocation && profile.shareLevel === option.level;
            return (
              <Pressable key={option.level} onPress={() => void changeLevel(option.level)} disabled={locating || busy}
                accessibilityRole="radio" accessibilityState={{ checked: active, disabled: locating || busy, busy: locating }}
                accessibilityLabel={`${option.title}. ${option.body}`}
                style={{ minHeight: 44, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: active ? c.volt : c.line, backgroundColor: active ? alpha(c.volt, 0.1) : c.surface }}>
                <Text style={[t.label, { color: active ? c.accent : c.txt }]}>{option.title}{active ? ' · On' : ''}</Text>
                <Text style={[t.caption, { color: c.txt3, marginTop: 2 }]}>{option.body}</Text>
              </Pressable>
            );
          })}
          {locating && <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Checking your location…</Text>}
          {/* Confirmed because it deletes the stored position outright: turning
              it back on needs the OS permission and a fresh capture, so this is
              not the same kind of toggle as the two above it. */}
          {profile.sharesLocation && (
            <ConfirmButton label="Stop sharing and remove me from the map" icon="map-pin"
              enabled={!locating && !busy}
              confirm={{
                title: 'Remove yourself from the map?',
                body: 'Your stored position is deleted. People nearby will no longer find you, '
                  + 'and distances stop showing on your profile.',
                confirmLabel: 'Remove me',
              }}
              onPress={() => void stopSharing()} />
          )}

          <GroupRule label="What you do" />
          <SectionHeading>Sports and hobbies</SectionHeading>
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            {profile.role === 'coach'
              ? 'What you do yourself — not what you teach. Your coaching subjects live in Coaching settings.'
              : 'What you play, train for or want to try.'}
          </Text>
          <SportsPicker selected={profile.sportIds} onChange={(sportIds) => setProfile({ ...profile, sportIds })} />

          {/* Certificates are part of what a coach shows about themselves, so
              they belong here rather than under their prices. They save
              themselves as they are added -- uploading a file and then losing
              it to an unsaved form is the worse failure. */}
          {profile.role === 'coach' && <Certificates coachId={profile.id} />}

          <Text style={[t.caption, { color: c.txt3 }]}>You can return to Profile → Edit profile at any time.</Text>

          {/* Required in-app by both stores wherever accounts can be created.
              It lives here, at the bottom of the screen that owns your profile,
              rather than beside Sign out -- the two sat next to each other and
              one of them is permanent. */}
          <GroupRule label="Account" />
          <SectionHeading>Delete account</SectionHeading>
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            Your profile, photo and personal data are removed and you will not be able to sign in again.
          </Text>
          {/* The page carries the plain button; the sheet carries the warning
              and the word. A form asking you to type "delete" sitting open on a
              screen you came to edit your bio reads like a threat. */}
          <Button label="Delete account" icon="trash-2" tone="danger" height={48} full
            enabled={!busy && !picking}
            onPress={() => { setDeleteWord(''); setError(null); setConfirmingDelete(true); }} />

          <FormSheet
            visible={confirmingDelete}
            title="Delete your account?"
            subtitle="This cannot be undone."
            onClose={() => { if (!deleting) setConfirmingDelete(false); }}
            footer={
              <Button label="Delete my account" icon="trash-2" tone="danger" height={48} full
                accessibilityLabel="Delete my account permanently"
                enabled={confirmed} busy={deleting} busyLabel="Deleting…"
                onPress={() => void removeAccount()} />
            }
          >
            {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              Your profile, photo and personal data are removed and you will not be able to sign in again. Sessions you have already had stay on the other person's record, because they are their history too.
            </Text>
            <Text style={[t.caption, { color: c.txt3 }]}>
              Type <Text style={{ color: c.danger }}>{DELETE_WORD}</Text> to confirm.
            </Text>
            <Field value={deleteWord} onChange={setDeleteWord} label={`Type ${DELETE_WORD} to confirm`}
              placeholder={DELETE_WORD} />
          </FormSheet>
        </View>}
      </View>
    </OverlayScaffold>
  );
}

// A labelled line between groups of fields.
//
// The editor had eight headings in one flat column and no way to tell that the
// area box and the map switch were about the same thing. A heading says what a
// field is; this says which part of yourself you are editing.
function GroupRule({ label }: { label: string }) {
  const { c, t } = useTheme();
  return (
    <Row gap={12} style={{ alignItems: 'center', marginTop: 10 }}>
      <Text style={[t.caption, { color: c.txt3, letterSpacing: 1.1, textTransform: 'uppercase' }]}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
    </Row>
  );
}
