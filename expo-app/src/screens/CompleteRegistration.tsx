import React, { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SportsPicker } from '../components/SportsPicker';
import { Avatar, Button, Field, Row, SectionHeading, VoltButton } from '../components/ui';
import { completeRegistration, providerLabel, RegistrationPrefill } from '../lib/registration';
import { signOutUser } from '../lib/session';
import { analyticsErrorCode, track } from '../lib/analytics';
import { initials } from '../state/models';
import { errorMessage, useStore } from '../state/store';
import { useTheme } from '../theme';
import { LocationField, RadiusSlider, RolePill } from './AuthLanding';

// The one registration form, for every way in.
//
// Shown after sign-in to any account that has no profile yet, whether it came
// from Google, Apple, Facebook, Microsoft or an email and password. Whatever
// the provider already told us is filled in -- name, email, photo -- and the
// rest is filled in by hand. Nobody gets a different kind of account because of
// which button they pressed.
//
// It is a gate, not an overlay: an account without a role has no Discover mode,
// no coach tools and no member profile for anybody to open, so there is nothing
// in the app it could sensibly show behind this.

export function CompleteRegistration({ prefill, onDone }: {
  prefill: RegistrationPrefill;
  onDone: () => void;
}) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStore();

  const [name, setName] = useState(prefill.name);
  // No default: this decides the kind of account, and a pre-chosen answer is
  // one nobody made.
  const [role, setRole] = useState<'coach' | 'member' | null>(null);
  const [sportIds, setSportIds] = useState<string[]>([]);
  const [area, setArea] = useState(s.authLoc);
  // The provider's photo is offered, not imposed: it is often an old one.
  const [keepPhoto, setKeepPhoto] = useState(Boolean(prefill.avatarUrl));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromProvider = prefill.provider !== 'email';
  const ready = name.trim().length > 1 && role !== null && !busy;

  const finish = async () => {
    if (!ready || !role) return;
    setBusy(true);
    setError(null);
    try {
      await completeRegistration({
        name,
        role,
        sportIds,
        area,
        avatarUrl: keepPhoto ? prefill.avatarUrl : null,
      });
      s.set('authLoc', area.trim());
      s.set('mode', role === 'coach' ? 'partners' : 'coaches');
      track('registration_completed', { role, method: prefill.provider });
      onDone();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 26, paddingBottom: insets.bottom + 120, paddingHorizontal: 26, gap: 22 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={[t.bodySm, { color: c.txt2 }]}>Almost there</Text>
          <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Complete your profile</Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 8 }]}>
            {fromProvider
              ? `Signed in with ${providerLabel(prefill.provider)}. We filled in what it shared with us — check it, then add the rest.`
              : 'Your account is ready. Tell people who you are and what you do.'}
          </Text>
        </View>

        {/* ---- Who you are ---- */}
        <Row gap={14} style={{ alignItems: 'center' }}>
          {keepPhoto && prefill.avatarUrl ? (
            <Image
              source={{ uri: prefill.avatarUrl }}
              accessibilityLabel={`Your ${providerLabel(prefill.provider)} photo`}
              style={{ width: 64, height: 64, borderRadius: 17, backgroundColor: c.surface }}
            />
          ) : (
            <Avatar initials={name.trim() ? initials(name) : ''} size={64} radius={17} fontSize={22} />
          )}
          <View style={{ flex: 1, gap: 6 }}>
            {prefill.avatarUrl ? (
              <Button
                label={keepPhoto ? 'Use no photo' : `Use my ${providerLabel(prefill.provider)} photo`}
                icon={keepPhoto ? 'x' : 'image'}
                onPress={() => setKeepPhoto(!keepPhoto)}
              />
            ) : (
              <Text style={[t.caption, { color: c.txt3 }]}>You can add a photo from your profile afterwards.</Text>
            )}
          </View>
        </Row>

        <View style={{ gap: 11 }}>
          <SectionHeading>Name</SectionHeading>
          <Field value={name} onChange={setName} placeholder="Your name" label="Your name" />
        </View>

        {prefill.email ? (
          <View style={{ gap: 6 }}>
            <SectionHeading>Email</SectionHeading>
            {/* Read-only: it is the address the account signs in with, and
                changing it is an account setting, not a profile detail. */}
            <Text style={[t.body, { color: c.txt2 }]}>{prefill.email}</Text>
          </View>
        ) : null}

        {/* ---- What you are ---- */}
        <View style={{ gap: 11 }}>
          <SectionHeading>Are you</SectionHeading>
          <Row gap={12}>
            <RolePill label="Coach/Teacher" active={role === 'coach'} onPress={() => setRole('coach')} />
            <RolePill label="Trainee/Student" active={role === 'member'} onPress={() => setRole('member')} />
          </Row>
        </View>

        {role && (
          <View style={{ gap: 11 }}>
            <SectionHeading>{role === 'coach' ? 'What you teach' : 'Your interests'}</SectionHeading>
            <SportsPicker selected={sportIds} onChange={setSportIds} coach={role === 'coach'} />
          </View>
        )}

        {/* ---- Where ---- */}
        <View style={{ gap: 6 }}>
          <SectionHeading>Your area</SectionHeading>
          <LocationField value={area} onChange={setArea} />
          <Text style={[t.caption, { color: c.txt3 }]}>A label people see on your profile. It does not limit who you find.</Text>
        </View>

        <View style={{ gap: 6 }}>
          <SectionHeading>How far you will travel</SectionHeading>
          <RadiusSlider value={s.searchRadius} onChange={(value) => s.set('searchRadius', value)} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={[t.caption, { color: c.txt2 }]}>1 Km</Text>
            <Text style={[t.caption, { color: c.accent }]}>{s.searchRadius} Km</Text>
            <Text style={[t.caption, { color: c.txt2 }]}>100 Km</Text>
          </Row>
        </View>

        {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}

        {/* An escape hatch: someone who signed in with the wrong account must
            not be trapped on a form they cannot finish. */}
        <Button label="Not you? Sign out" icon="log-out" onPress={() => void signOutUser()} />
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: 16, paddingBottom: insets.bottom + 16,
        backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line,
      }}>
        <VoltButton
          icon="check"
          label={!name.trim() ? 'Add your name' : !role ? 'Choose coach or trainee' : 'Finish'}
          busy={busy}
          busyLabel="Saving…"
          enabled={ready}
          onPress={() => void finish()}
        />
      </View>
    </View>
  );
}
