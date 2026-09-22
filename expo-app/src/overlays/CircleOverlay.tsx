import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Button, MicroBadge, Row, VoltButton } from '../components/ui';
import { CirclePerson, fetchCircle } from '../lib/social';
import { initials } from '../state/models';
import { errorMessage, useStore } from '../state/store';
import { useTheme } from '../theme';

// The people this account follows: coaches kept for later, partners trained
// with, anyone whose activity should reach the notifications page.
export function CircleOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [people, setPeople] = useState<CirclePerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Re-read when the set of followed ids changes, so unfollowing from this
  // screen removes the row rather than leaving a stale one behind.
  const followedKey = s.followedIds.join(',');
  useEffect(() => {
    let active = true;
    setError(null);
    fetchCircle()
      .then((rows) => { if (active) setPeople(rows); })
      .catch((e) => { if (active) { setPeople([]); setError(errorMessage(e)); } });
    return () => { active = false; };
  }, [attempt, followedKey, s.authUid]);

  return (
    <OverlayScaffold header={<OverlayHeader title="Your circle" subtitle={
      people === null ? undefined : `${people.length} ${people.length === 1 ? 'person' : 'people'}`
    } onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18, gap: 12 }}>
        {error && <>
          <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>
          <VoltButton label="Try again" onPress={() => setAttempt(attempt + 1)} />
        </>}

        {people === null && !error && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading your circle…</Text>
        )}

        {people?.length === 0 && !error && (
          <View style={{ gap: 6, paddingTop: 8 }}>
            <Text style={[t.label, { color: c.txt }]}>You are not following anyone yet.</Text>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              Follow a coach or a training partner from their profile. Their new sessions, events and messages then show up in your notifications.
            </Text>
          </View>
        )}

        {people?.map((person) => (
          <Row key={person.id} gap={12} style={{ alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${person.name}`}
              onPress={() => s.openPerson(person.id)}
              style={{ flex: 1, minHeight: 56 }}
            >
              <Row gap={12} style={{ alignItems: 'center' }}>
                <Avatar initials={initials(person.name)} avatarUrl={person.avatarUrl} size={44} radius={14} />
                <View style={{ flex: 1 }}>
                  <Row gap={8} style={{ alignItems: 'center' }}>
                    <Text numberOfLines={1} style={[t.name, { color: c.txt }]}>{person.name}</Text>
                    {person.role === 'coach' && <MicroBadge label="Coach" bg={c.volt} fg={c.ink} />}
                  </Row>
                  {person.sport && <Text numberOfLines={1} style={[t.bodySm, { color: c.txt2 }]}>{person.sport}</Text>}
                </View>
              </Row>
            </Pressable>
            <Button
              label="Following"
              icon="check"
              accessibilityLabel={`Stop following ${person.name}`}
              busy={s.writeBusy === `follow:${person.id}`}
              busyLabel="Saving…"
              onPress={() => void s.toggleFollow(person.id)}
            />
          </Row>
        ))}
      </View>
    </OverlayScaffold>
  );
}
