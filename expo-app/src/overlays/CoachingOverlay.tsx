import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Field, Icon, MicroBadge, Row, SectionHeading, VoltButton } from '../components/ui';
import { PickedAvatar } from '../lib/avatars';
import {
  addCertification, becomeCoach, Certification, fetchCertifications,
  isCoach, pickCertificateImage, removeCertification,
} from '../lib/coaching';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, useStore } from '../state/store';
import { useTheme } from '../theme';

// Becoming a coach, and the certificates that back it up.
//
// Both live here rather than in Edit profile because they are a different kind
// of decision: Edit profile changes how you look, this changes what you are on
// the platform and what you are claiming about yourself.
export function CoachingOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [coach, setCoach] = useState<boolean | null>(null);
  const [certs, setCerts] = useState<Certification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [headline, setHeadline] = useState('');
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [year, setYear] = useState('');
  const [image, setImage] = useState<PickedAvatar | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let active = true;
    setError(null);
    (async () => {
      const mine = await isCoach();
      if (!active) return;
      setCoach(mine);
      if (mine) {
        const appId = s.authUserId;
        if (appId) setCerts(await fetchCertifications(appId));
        else setCerts([]);
      }
    })().catch((e) => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [attempt, s.authUserId, s.authUid]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await becomeCoach(headline);
      track('became_coach');
      // The role is derived server-side from owning a coach profile, so the
      // store has to re-read it rather than assume.
      await s.refreshRole();
      s.set('profileRevision', s.profileRevision + 1);
      setAttempt(attempt + 1);
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  const choose = async () => {
    if (picking) return;
    setPicking(true);
    setError(null);
    try {
      const picked = await pickCertificateImage();
      if (picked) setImage(picked);
    } catch (e) { setError(errorMessage(e)); }
    finally { setPicking(false); }
  };

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await addCertification({ name, issuer, year, image });
      track('certificate_added');
      setName(''); setIssuer(''); setYear(''); setImage(null);
      setAttempt(attempt + 1);
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  const drop = async (cert: Certification) => {
    setBusy(true);
    setError(null);
    try {
      await removeCertification(cert.id, cert.fileUrl);
      setAttempt(attempt + 1);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <OverlayScaffold header={<OverlayHeader title="Coaching" onBack={s.closeOverlay}
      subtitle={coach ? 'Your credentials' : 'Free for coaches and members'} />}>
      <View style={{ paddingHorizontal: 18, gap: 16 }}>
        {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
        {coach === null && !error && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading…</Text>
        )}

        {coach === false && (
          <>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              Coaching adds a public coach profile, so people can find you in Discover and book sessions with you. It is free, and you keep your member profile.
            </Text>
            <Text style={[t.caption, { color: c.txt3 }]}>
              Once you become a coach you stay one — there is no undo in the app, so ask us if you change your mind.
            </Text>
            <SectionHeading>What do you coach?</SectionHeading>
            <Field value={headline} onChange={setHeadline} label="Coach headline"
              placeholder="Strength coach, 6 years" />
            <VoltButton label="Become a coach" busy={busy} busyLabel="Setting up…"
              enabled={headline.trim().length > 1 && !busy} onPress={() => void start()} />
          </>
        )}

        {coach === true && (
          <>
            <SectionHeading>Your certificates</SectionHeading>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              Certificates appear on your public profile, so anyone can see them. A certificate photo often shows your full legal name — only upload one you are happy to show.
            </Text>
            <Text style={[t.caption, { color: c.txt3 }]}>
              New certificates stay “Pending review” until an admin checks them. Nothing here is shown as verified until then.
            </Text>

            {certs?.length === 0 && (
              <Text style={[t.bodySm, { color: c.txt3 }]}>You have not added a certificate yet.</Text>
            )}

            {certs?.map((cert) => (
              <View key={cert.id} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' }}>
                {cert.fileUrl && (
                  <Image source={{ uri: cert.fileUrl }} accessibilityIgnoresInvertColors
                    accessibilityLabel={`${cert.name} certificate`}
                    style={{ width: '100%', height: 160, backgroundColor: c.surface }} resizeMode="cover" />
                )}
                <Row gap={10} style={{ alignItems: 'center', padding: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.name, { color: c.txt }]}>{cert.name}</Text>
                    <Text style={[t.bodySm, { color: c.txt2 }]}>
                      {[cert.issuer, cert.year].filter(Boolean).join(' · ') || 'No issuer given'}
                    </Text>
                  </View>
                  <MicroBadge
                    label={cert.status === 'approved' ? 'Verified' : 'Pending review'}
                    bg={cert.status === 'approved' ? c.volt : c.surface2}
                    fg={cert.status === 'approved' ? c.ink : c.txt2}
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${cert.name}`}
                    onPress={() => void drop(cert)} disabled={busy}
                    style={{ minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trash-2" size={18} color={c.txt3} />
                  </Pressable>
                </Row>
              </View>
            ))}

            <SectionHeading>Add a certificate</SectionHeading>
            <Field value={name} onChange={setName} label="Certificate name" placeholder="Level 3 Personal Trainer" />
            <Field value={issuer} onChange={setIssuer} label="Issued by" placeholder="Issuing body" />
            <Field value={year} onChange={setYear} label="Year" placeholder="2024" keyboardType="decimal-pad" />
            <Row gap={14} style={{ alignItems: 'center' }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo of the certificate"
                accessibilityState={{ busy: picking }} onPress={() => void choose()} disabled={picking || busy}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[t.label, { color: c.accent }]}>
                  {picking ? 'Opening photos…' : image ? 'Change photo' : 'Add a photo'}
                </Text>
              </Pressable>
              {image && (
                <Image source={{ uri: image.uri }} accessibilityIgnoresInvertColors
                  accessibilityLabel="Selected certificate photo"
                  style={{ width: 56, height: 40, borderRadius: 8, backgroundColor: c.surface }} />
              )}
            </Row>
            <VoltButton label="Add certificate" busy={busy} busyLabel="Saving…"
              enabled={name.trim().length > 1 && !busy && !picking} onPress={() => void add()} />
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}
