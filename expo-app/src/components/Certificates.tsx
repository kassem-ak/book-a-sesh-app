import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Field, Icon, MicroBadge, Row, SectionHeading, VoltButton } from './ui';
import { PickedAvatar } from '../lib/avatars';
import {
  addCertification, Certification, fetchCertifications, pickCertificateImage, removeCertification,
} from '../lib/coaching';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage } from '../state/store';
import { useTheme } from '../theme';

// A coach's certificates.
//
// Its own component because it moved: it used to sit at the bottom of the
// coaching screen, underneath prices, and belongs with the rest of what a coach
// shows about themselves. Pulling it out rather than copying it means there is
// still one place that knows how a certificate is added, reviewed and removed.
//
// It owns its own loading and writes. The profile editor around it holds a
// draft that is saved on a button; a certificate is not part of that draft --
// uploading a file and then losing it to an unsaved form would be the worse
// failure.
export function Certificates({ coachId }: { coachId: string }) {
  const { c, t } = useTheme();
  const [certs, setCerts] = useState<Certification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [year, setYear] = useState('');
  const [image, setImage] = useState<PickedAvatar | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let active = true;
    setError(null);
    fetchCertifications(coachId)
      .then((rows) => { if (active) setCerts(rows); })
      .catch((e) => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [coachId, attempt]);

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
    <View style={{ gap: 16 }}>
      <SectionHeading>Your certificates</SectionHeading>
      {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        Certificates appear on your public profile, so anyone can see them. A certificate photo often shows your full legal name — only upload one you are happy to show.
      </Text>
      <Text style={[t.caption, { color: c.txt3 }]}>
        New certificates stay “Pending review” until an admin checks them. Nothing here is shown as verified until then.
      </Text>

      {certs === null && !error && (
        <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading certificates…</Text>
      )}
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
    </View>
  );
}
