import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  Button, ConfirmSheet, Field, FormSheet, Icon, MicroBadge, Row, SectionHeading, VoltButton,
} from './ui';
import { HoldableItem, SafeItemAction } from './ItemMenu';
import { PickedAvatar } from '../lib/avatars';
import {
  addCertification, Certification, fetchCertifications, isPdf, pickCertificateFile,
  removeCertification,
} from '../lib/coaching';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage } from '../state/store';
import { alpha, useTheme } from '../theme';

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
  const [adding, setAdding] = useState(false);

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
      const picked = await pickCertificateFile();
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
      setAdding(false);
      setAttempt(attempt + 1);
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  // Asked for first. This deletes the uploaded file as well as the row, and
  // nothing in the app can put either back -- while "Mark done", which is
  // reversible, already asks.
  // The confirmation moved onto the tile itself: HoldableItem will not run a
  // destructive action without asking, so a second sheet here would make the
  // reader answer the same question twice.
  //
  // The one being looked at. A tile is a thumbnail, and a certificate is a
  // document somebody wants to actually read.
  const [viewing, setViewing] = useState<Certification | null>(null);

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
      <CertificateViewer cert={viewing} onClose={() => setViewing(null)} />
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

      {/* Three to a row. A certificate is a thing you recognise at a glance --
          the paper, the crest, the shape of it -- so the thumbnail is the
          card and the words go underneath. One per row made a wall of scrolling
          for something most coaches have three or four of. */}
      <Row style={{ flexWrap: 'wrap', gap: TILE_GAP }}>
        {certs?.map((cert) => (
          <CertificateTile key={cert.id} cert={cert} busy={busy}
            onOpen={() => setViewing(cert)}
            onRemove={() => void drop(cert)} />
        ))}
      </Row>

      {/* The form is a detour, not part of the page. Inline, four fields and a
          photo picker sat under the list whether or not anyone was adding
          anything, pushing everything below them down. */}
      <VoltButton label="Add a certificate" enabled={!busy} onPress={() => { setError(null); setAdding(true); }} />

      <FormSheet
        visible={adding}
        title="Add a certificate"
        subtitle="It appears on your public profile once an admin has checked it."
        onClose={() => { if (!busy && !picking) setAdding(false); }}
        footer={
          <VoltButton label="Add certificate" busy={busy} busyLabel="Saving…"
            enabled={name.trim().length > 1 && !busy && !picking} onPress={() => void add()} />
        }
      >
        {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
        <Field value={name} onChange={setName} label="Certificate name" placeholder="Level 3 Personal Trainer" />
        <Field value={issuer} onChange={setIssuer} label="Issued by" placeholder="Issuing body" />
        <Field value={year} onChange={setYear} label="Year" placeholder="2024" keyboardType="decimal-pad" />
        <Row gap={14} style={{ alignItems: 'center' }}>
          <Button label={image ? 'Change photo' : 'Add a photo'} icon="image"
            busy={picking} busyLabel="Opening photos…" enabled={!busy}
            accessibilityLabel="Choose a photo of the certificate" onPress={() => void choose()} />
          {image && (
            <Image source={{ uri: image.uri }} accessibilityIgnoresInvertColors
              accessibilityLabel="Selected certificate photo"
              style={{ width: 56, height: 40, borderRadius: 8, backgroundColor: c.surface }} />
          )}
        </Row>
      </FormSheet>
    </View>
  );
}

// Three to a row, on any width.
//
// The gap is fixed and the tiles take what is left, so the grid holds on a
// small phone and on a tablet without a breakpoint. `flexBasis: 0` with
// `flexGrow: 1` rather than a percentage: percentages fight the gap, and three
// 33% tiles plus two gaps is wider than the row.
export const TILE_GAP = 10;

// Exported because a coach's profile shows the same certificates to visitors,
// and two grids of the same thing drift apart. The difference is one prop: a
// visitor gets no delete, so `onRemove` is optional rather than a second
// component.
export function CertificateTile({ cert, busy, onOpen, onRemove }: {
  cert: Certification;
  busy?: boolean;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  const { c, t } = useTheme();
  const approved = cert.status === 'approved';
  const pdf = isPdf(cert.fileUrl);

  // Hold the tile rather than aim at a trash can on it. The delete button was
  // the smallest target on a third-of-a-phone tile and sat one mis-tap from
  // destroying a credential somebody had to upload and wait to have verified.
  const actions: SafeItemAction[] = [
    { key: 'open', label: 'View the certificate', icon: 'maximize-2', onPress: onOpen },
    ...(onRemove ? [{
      key: 'remove',
      label: 'Remove it',
      icon: 'trash-2' as const,
      destructive: true as const,
      confirm: {
        title: `Remove ${cert.name}?`,
        body: 'The certificate and its file are deleted. If it was verified you will have to '
          + 'upload it and be reviewed again.',
        confirmLabel: 'Remove it',
      },
      onPress: onRemove,
    }] : []),
  ];

  return (
    <HoldableItem
      actions={actions}
      onPress={onOpen}
      busy={busy}
      // The badge sits top-LEFT, so the dots have the top-right corner to
      // themselves. Hold still works; this is the way in for anyone who does
      // not know that.
      showMore
      menuTitle={cert.name}
      menuSubtitle={[cert.issuer, cert.year].filter(Boolean).join(' · ') || undefined}
      accessibilityLabel={`${cert.name}${cert.issuer ? `, ${cert.issuer}` : ''}`}
      style={{
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      // A third of a phone width is narrow; without this a two-word issuer
      // pushes the tile wider than its share and the row wraps to two.
      minWidth: 96,
      maxWidth: '32%',
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: c.surface,
    }}>
      <View style={{ aspectRatio: 1, backgroundColor: c.surface2 }}>
        {cert.fileUrl && !pdf && (
          <Image source={{ uri: cert.fileUrl }} accessibilityIgnoresInvertColors
            accessibilityLabel={`${cert.name} certificate`}
            style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        )}
        {cert.fileUrl && pdf && (
          // A PDF has no thumbnail here. React Native cannot rasterise a page
          // without a native renderer, so the tile says what the file is
          // rather than showing an empty square and hoping.
          <View accessibilityLabel={`${cert.name} certificate, PDF`}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="file-text" size={26} color={c.txt3} />
            <Text style={[t.caption, { color: c.txt3, letterSpacing: 1 }]}>PDF</Text>
          </View>
        )}
        {!cert.fileUrl && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="award" size={26} color={c.txt3} />
          </View>
        )}

        {/* Over the thumbnail rather than under it: the tile is small, and a
            row of words below would leave no room for the picture. */}
        <View style={{ position: 'absolute', top: 6, left: 6 }}>
          <MicroBadge
            label={approved ? 'Verified' : 'Pending'}
            bg={approved ? c.volt : alpha(c.ink, 0.66)}
            fg={approved ? c.ink : '#FFFFFF'}
          />
        </View>
      </View>

      <View style={{ padding: 8, gap: 1 }}>
        <Text numberOfLines={2} style={[t.labelSm, { color: c.txt }]}>{cert.name}</Text>
        <Text numberOfLines={1} style={[t.caption, { color: c.txt3 }]}>
          {[cert.issuer, cert.year].filter(Boolean).join(' · ') || 'No issuer'}
        </Text>
      </View>
    </HoldableItem>
  );
}

// The certificate, big enough to read.
//
// An image is shown here. A PDF is not: React Native has no page renderer, so
// the honest thing is to hand it to something that does rather than draw an
// empty frame. Either way "Open" goes to the browser, which is also where a
// download lives -- on the web that is the browser's own save, and on a phone
// it is the system viewer's share sheet. Re-implementing either would mean
// writing a file somewhere and asking for permission to do it.
export function CertificateViewer({ cert, onClose }: {
  cert: Certification | null;
  onClose: () => void;
}) {
  const { c, t } = useTheme();
  const [error, setError] = useState<string | null>(null);
  if (!cert) return null;
  const pdf = isPdf(cert.fileUrl);

  const open = () => {
    if (!cert.fileUrl) return;
    setError(null);
    void (async () => {
      try {
        // A new tab on the web: openBrowserAsync navigates the page itself
        // there, which on this app would unmount everything behind it.
        if (Platform.OS === 'web') window.open(cert.fileUrl!, '_blank', 'noopener');
        else await WebBrowser.openBrowserAsync(cert.fileUrl!);
      } catch {
        setError('Could not open that file.');
      }
    })();
  };

  return (
    <FormSheet
      visible
      title={cert.name}
      subtitle={[cert.issuer, cert.year].filter(Boolean).join(' · ') || undefined}
      onClose={onClose}
      footer={cert.fileUrl ? (
        <Button label={pdf ? 'Open the PDF' : 'Open full size'} icon="external-link"
          tone="primary" full height={52}
          accessibilityLabel={`Open ${cert.name}, and save it from there`}
          onPress={open} />
      ) : (
        <Button label="Close" icon="x" full onPress={onClose} />
      )}
    >
      <View style={{ gap: 12 }}>
        {cert.fileUrl && !pdf && (
          <Image source={{ uri: cert.fileUrl }} accessibilityIgnoresInvertColors
            accessibilityLabel={`${cert.name} certificate`}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: c.surface2 }}
            resizeMode="contain" />
        )}
        {cert.fileUrl && pdf && (
          <View style={{
            width: '100%', aspectRatio: 1.6, borderRadius: 12, backgroundColor: c.surface2,
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Icon name="file-text" size={34} color={c.txt3} />
            <Text style={[t.bodySm, { color: c.txt2 }]}>This certificate is a PDF.</Text>
          </View>
        )}
        {!cert.fileUrl && (
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            No file was uploaded with this certificate.
          </Text>
        )}
        <Text style={[t.caption, { color: c.txt3 }]}>
          {cert.status === 'approved'
            ? 'Verified by an admin, and shown as verified on your public profile.'
            : 'Pending review. It is on your profile, but not marked verified yet.'}
        </Text>
        {error && (
          <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>
        )}
      </View>
    </FormSheet>
  );
}
