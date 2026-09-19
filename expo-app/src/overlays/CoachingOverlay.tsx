import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Field, Icon, MicroBadge, Row, SectionHeading, Toggle, VoltButton } from '../components/ui';
import { PickedAvatar } from '../lib/avatars';
import {
  addCertification, becomeCoach, Certification, fetchCertifications,
  isCoach, pickCertificateImage, removeCertification,
} from '../lib/coaching';
import {
  addPromo, CoachPricing, fetchMyPricing, money, parseMoney, Promo, removePackage,
  removePromo, savePackage, SessionPackage, setPackageActive, setPromoActive, setSessionRate,
} from '../lib/pricing';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, useStore } from '../state/store';
import { useTheme } from '../theme';

// Becoming a coach -- and, once you are one, what you charge.
//
// This lives here rather than in Edit profile because it is a different kind of
// decision: Edit profile changes how you look, this changes what you are on the
// platform, what you are claiming about yourself, and what people pay you.
//
// The page turns over entirely at the moment the role changes. Before: one
// question. After: your prices first, because that is what a working coach
// comes back to change -- certificates are set once and rarely touched again.
export function CoachingOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [coach, setCoach] = useState<boolean | null>(null);
  const [certs, setCerts] = useState<Certification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [pricing, setPricing] = useState<CoachPricing | null>(null);
  const [rate, setRate] = useState('');
  const [pkgSessions, setPkgSessions] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoPct, setPromoPct] = useState('');

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
        const current = await fetchMyPricing();
        if (!active) return;
        setPricing(current);
        setRate(current.rateCents ? money(current.rateCents) : '');
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

  // ---- pricing ----------------------------------------------------------

  // Every pricing write follows the same shape: run it, then re-read. The
  // alternative -- patching local state optimistically -- means the screen can
  // show a price the server refused, which is the one thing a price list must
  // never do.
  const priced = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      setPricing(await fetchMyPricing());
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  const saveRate = () => {
    const cents = parseMoney(rate);
    if (cents === null) { setError('Enter a rate like 45 or 45.50.'); return; }
    void priced(async () => {
      await setSessionRate(cents);
      track('coach_rate_set');
      // Discover sorts and quotes from this, so the cached people list is stale
      // the moment it changes.
      s.set('profileRevision', s.profileRevision + 1);
    });
  };

  const addPackage = () => {
    const sessions = Number(pkgSessions.replace(/[^0-9]/g, ''));
    const cents = parseMoney(pkgPrice);
    if (cents === null) { setError('Enter a package price like 400 or 399.99.'); return; }
    void priced(async () => {
      await savePackage({ sessions, priceCents: cents });
      track('coach_package_added');
      setPkgSessions(''); setPkgPrice('');
      s.set('profileRevision', s.profileRevision + 1);
    });
  };

  const createPromo = () => {
    const pct = Number(promoPct.replace(/[^0-9]/g, ''));
    void priced(async () => {
      await addPromo(promoCode, pct);
      track('coach_promo_added');
      setPromoCode(''); setPromoPct('');
    });
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
      subtitle={coach ? 'Your prices and credentials' : 'Free for coaches and members'} />}>
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
            <SectionHeading>Your rate</SectionHeading>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              What one session with you costs. This is the price people see in Discover and on the Book button.
            </Text>
            <Row gap={10} style={{ alignItems: 'center' }}>
              <Text style={[t.price, { color: c.accent }]}>$</Text>
              <View style={{ flex: 1 }}>
                <Field value={rate} onChange={setRate} label="Price per session"
                  placeholder="45" keyboardType="decimal-pad" />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Save your rate per session"
                onPress={saveRate} disabled={busy}
                style={{ minHeight: 44, paddingHorizontal: 6, justifyContent: 'center' }}>
                <Text style={[t.label, { color: c.accent }]}>Save</Text>
              </Pressable>
            </Row>
            <Text style={[t.caption, { color: c.txt3 }]}>
              Leave it at 0 and BOOK’D quotes nothing rather than guessing a figure for you.
            </Text>

            <SectionHeading>Session packages</SectionHeading>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              A block of sessions bought at once, usually cheaper per session than booking them one by one.
            </Text>

            {pricing?.packages.length === 0 && (
              <Text style={[t.bodySm, { color: c.txt3 }]}>No packages yet — people can still book single sessions.</Text>
            )}

            {pricing?.packages.map((pkg: SessionPackage) => (
              <Row key={pkg.id} gap={10} style={{ alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.name, { color: c.txt }]}>{pkg.sessions} sessions · ${money(pkg.priceCents)}</Text>
                  <Text style={[t.bodySm, { color: c.txt2 }]}>${money(pkg.perSessionCents)} a session</Text>
                </View>
                {/* Switching off is the gentler gesture and comes first: clients
                    who already bought this package keep reading its label. */}
                <Toggle value={pkg.active} onChange={(next) => void priced(() => setPackageActive(pkg.id, next))} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete the ${pkg.sessions} session package`}
                  onPress={() => void priced(() => removePackage(pkg.id))} disabled={busy}
                  style={{ minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="trash-2" size={18} color={c.txt3} />
                </Pressable>
              </Row>
            ))}

            <Row gap={10} style={{ alignItems: 'center' }}>
              <View style={{ width: 92 }}>
                <Field value={pkgSessions} onChange={setPkgSessions} label="Number of sessions"
                  placeholder="10" keyboardType="decimal-pad" />
              </View>
              <Text style={[t.price, { color: c.accent }]}>$</Text>
              <View style={{ flex: 1 }}>
                <Field value={pkgPrice} onChange={setPkgPrice} label="Package price"
                  placeholder="400" keyboardType="decimal-pad" />
              </View>
            </Row>
            <VoltButton label="Add package" busy={busy} busyLabel="Saving…"
              enabled={pkgSessions.trim() !== '' && pkgPrice.trim() !== '' && !busy} onPress={addPackage} />

            <SectionHeading>Promotions</SectionHeading>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              A code that takes a percentage off your prices. Switch one off and it stops working without disappearing.
            </Text>

            {pricing?.promos.length === 0 && (
              <Text style={[t.bodySm, { color: c.txt3 }]}>No promotions running.</Text>
            )}

            {pricing?.promos.map((promo: Promo) => (
              <Row key={promo.id} gap={10} style={{ alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.name, { color: c.txt }]}>{promo.code}</Text>
                  <Text style={[t.bodySm, { color: c.txt2 }]}>{promo.pct}% off</Text>
                </View>
                <Toggle value={promo.active} onChange={(next) => void priced(() => setPromoActive(promo.id, next))} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete the code ${promo.code}`}
                  onPress={() => void priced(() => removePromo(promo.id))} disabled={busy}
                  style={{ minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="trash-2" size={18} color={c.txt3} />
                </Pressable>
              </Row>
            ))}

            <Row gap={10} style={{ alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Field value={promoCode} onChange={setPromoCode} label="Promotion code"
                  placeholder="SUMMER20" />
              </View>
              <View style={{ width: 82 }}>
                <Field value={promoPct} onChange={setPromoPct} label="Percentage off"
                  placeholder="20" keyboardType="decimal-pad" />
              </View>
              <Text style={[t.price, { color: c.accent }]}>%</Text>
            </Row>
            <VoltButton label="Add promotion" busy={busy} busyLabel="Saving…"
              enabled={promoCode.trim().length > 2 && promoPct.trim() !== '' && !busy} onPress={createPromo} />

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
