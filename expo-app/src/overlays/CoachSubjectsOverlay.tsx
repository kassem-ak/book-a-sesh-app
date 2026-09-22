import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { CoachAvailability } from '../components/CoachAvailability';
import { SportsPicker } from '../components/SportsPicker';
import { ActionBar, Field, SectionHeading, VoltButton } from '../components/ui';
import { CoachBasics, fetchCoachBasics, saveCoachBasics } from '../lib/coaching';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, useStore } from '../state/store';
import { useTheme } from '../theme';

// What a coach teaches, and how experienced they are at it.
//
// Its own screen, alongside the other coach tools, rather than a section of a
// combined one. The things a coach sets are not one settings page: what you
// teach, when you work and what you charge are three different decisions made
// at three different times, and stacking them made a screen nobody could scan.

export function CoachSubjectsOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [basics, setBasics] = useState<CoachBasics | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setError(null);
    fetchCoachBasics()
      .then((value) => { if (active) setBasics(value); })
      .catch((e) => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [s.authUserId]);

  // Subject and experience save together: they are one answer to "what do you
  // coach, and how well", and two Save buttons a centimetre apart invites
  // pressing the wrong one.
  const save = () => {
    if (!basics) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    void (async () => {
      try {
        await saveCoachBasics(basics);
        track('coach_basics_saved');
        // Discover reads the primary specialty and the headline, so the cached
        // people list is stale the moment either changes.
        s.set('profileRevision', s.profileRevision + 1);
        setSaved(true);
      } catch (e) {
        track('write_failed', { error_code: analyticsErrorCode(e) });
        setError(errorMessage(e));
      } finally { setBusy(false); }
    })();
  };

  return (
    <OverlayScaffold
      header={<OverlayHeader title="What you teach" onBack={s.closeOverlay}
        subtitle="Your subjects and experience" />}
      // Saving is what this screen is for, so it sits in the bar rather than
      // under the last field: the subjects picker is tall enough that the save
      // used to scroll out of sight while someone was still choosing. The
      // confirmation rides with it, because a line that says "Saved" a screen
      // away from the button that did it is read as being about something else.
      bottomBar={basics ? (
        <ActionBar note={saved ? (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.accent }]}>
            Saved. Your public profile shows this now.
          </Text>
        ) : undefined}>
          <VoltButton label="Save" busy={busy} busyLabel="Saving…" enabled={!busy} onPress={save} />
        </ActionBar>
      ) : undefined}
    >
      <View style={{ paddingHorizontal: 18, gap: 16 }}>
        {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
        {!basics && !error && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading…</Text>
        )}

        {basics && <>
          <SectionHeading>Your subjects</SectionHeading>
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            The first is the one you lead with — it is what people see in Discover and what they filter by.
          </Text>
          <Text style={[t.caption, { color: c.txt3 }]}>
            This is separate from your own sports and hobbies, which live in Edit profile. You can teach one thing and
            play another.
          </Text>
          <SportsPicker
            selected={basics.teachingIds}
            onChange={(teachingIds) => { setBasics({ ...basics, teachingIds }); setSaved(false); }}
            coach
          />

          <SectionHeading>Your experience</SectionHeading>
          <Field value={basics.headline} onChange={(headline) => { setBasics({ ...basics, headline }); setSaved(false); }}
            label="Coach headline" placeholder="Strength coach, 6 years" />
          <Field value={basics.level} onChange={(level) => { setBasics({ ...basics, level }); setSaved(false); }}
            label="Your coaching level" placeholder="Level 3 certified · national squad" />
        </>}
      </View>
    </OverlayScaffold>
  );
}

// When a coach works, on its own screen.
//
// The editor already owns its loading, its writes and its errors, so this is
// only the frame around it.
export function CoachHoursOverlay() {
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="When you coach" onBack={s.closeOverlay}
      subtitle="Working hours and days off" />}>
      <View style={{ paddingHorizontal: 18 }}>
        <CoachAvailability />
      </View>
    </OverlayScaffold>
  );
}
