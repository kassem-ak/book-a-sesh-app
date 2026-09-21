import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Field, Icon, Row, SectionHeading, Toggle, VoltButton } from '../components/ui';
import { becomeCoach, isCoach } from '../lib/coaching';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, useStore } from '../state/store';
import { useTheme } from '../theme';

// Becoming a coach -- and, once you are one, what you charge.
//
// Certificates used to sit at the bottom of this screen. They moved into Edit
// profile, with the rest of what a coach shows about themselves; this page is
// now only about money.
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);


  const [headline, setHeadline] = useState('');

  useEffect(() => {
    let active = true;
    setError(null);
    (async () => {
      const mine = await isCoach();
      if (!active) return;
      setCoach(mine);
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

  return (
    <OverlayScaffold header={<OverlayHeader title={coach ? 'Coaching settings' : 'Coaching'} onBack={s.closeOverlay}
      subtitle={coach ? 'What you teach, and when' : 'Free for coaches and members'} />}>
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

        {/* Already a coach: what they set lives in Coach tools now, one screen
            each. What you teach, when you work and what you charge are three
            decisions made at three different times, and stacking them into one
            settings page made something nobody could scan. */}
        {coach === true && (
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            You are a coach. Your subjects, your hours and your prices are in Coach tools on your profile.
          </Text>
        )}
      </View>
    </OverlayScaffold>
  );
}
