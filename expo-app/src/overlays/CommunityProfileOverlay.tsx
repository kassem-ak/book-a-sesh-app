import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MissingSubject, OverlayHeader } from '../components/Overlay';
import { ScrollAwareFab, useScrollAwareFab } from '../components/ScrollAwareFab';
import {
  Avatar, Button, Card, Icon, MicroBadge, Row, StripedPlaceholder,
} from '../components/ui';
import { isMeetup } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';


export function CommunityProfileOverlay() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStore();
  const cm = s.communityById(s.communityId);
  const events = s.allEvents().filter((e) => e.communityId === cm?.id);
  const canManage = s.canModerateCommunity(cm?.id);

  const [shownEvents, setShownEvents] = useState(3);
  const { anim, onScroll, visible } = useScrollAwareFab();


  // After the hooks so hook order is stable: a community id that is not in the
  // fetched list used to resolve to an invented sample community.
  if (!cm) return <MissingSubject title="Community" message="This community is no longer listed." onBack={s.closeOverlay} />;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <OverlayHeader title={cm.sport} onBack={s.closeOverlay} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* identity block */}
        <View style={{ paddingHorizontal: 18 }}>
          <Card style={{ marginTop: 12, padding: 15 }}>
            <Row gap={12} style={{ alignItems: 'flex-start' }}>
              <Avatar initials={cm.code} size={58} radius={17} bg={cm.tint} fontSize={18} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Row gap={8} style={{ alignItems: 'flex-start' }}>
                  <Text style={[t.overlayTitle, { color: c.txt, flex: 1 }]}>{cm.sport}</Text>
                  {/* Verified check belongs to official communities only — it
                      was rendering unconditionally, next to a missing badge. */}
                  {cm.official && <Icon name="check-circle" size={17} color={c.accent} />}
                  {canManage && (
                    <Pressable
                      onPress={() => s.openEditCommunity()}
                      accessibilityRole="button"
                      accessibilityLabel="Edit community details"
                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    >
                      <Icon name="edit-2" size={17} color={c.txt3} />
                    </Pressable>
                  )}
                </Row>
                <Row gap={8} style={{ marginTop: 6, flexWrap: 'wrap' }}>
                  {cm.official && <MicroBadge label="Official Federation" bg={alpha(c.volt, 0.12)} fg={c.accent} />}
                  <Text style={[t.labelSm, { color: c.soft }]}>{cm.members} Members</Text>
                </Row>
                <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>Sports, {cm.sport}</Text>
              </View>
            </Row>

            <Text style={[t.caption, { color: c.txt3, marginTop: 13, letterSpacing: 0.4 }]}>Bio:</Text>
            <Text style={[t.bodySm, { color: c.soft, marginTop: 3, lineHeight: 20 }]}>{cm.about}</Text>

          </Card>

          {/* EVENTS — cards + Load More */}
          {(
            <View style={{ marginTop: 14, gap: 12 }}>
              {events.length === 0 && (
                <Text style={[t.bodySm, { color: c.txt3, marginTop: 8 }]}>No events scheduled yet.</Text>
              )}
              {events.slice(0, shownEvents).map((ev) => (
                <Card key={ev.id} onPress={() => s.openEvent(ev.id, 'communityProfile')} style={{ padding: 12 }}>
                  <StripedPlaceholder caption="" height={110} />
                  <View style={{ marginTop: 10 }}>
                    <MicroBadge
                      label={ev.type}
                      bg={isMeetup(ev) ? alpha(c.volt, 0.12) : alpha(c.amber, 0.2)}
                      fg={isMeetup(ev) ? c.accent : c.amberText}
                    />
                  </View>
                  <Text style={[t.name, { color: c.txt, marginTop: 8 }]}>{ev.title}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{ev.whenLabel} · {ev.loc}</Text>
                  <Text style={[t.caption, { color: c.txt3, marginTop: 4 }]}>{ev.attendees} going</Text>
                </Card>
              ))}
              {shownEvents < events.length && (
                <Button label="Load more" icon="chevron-down" full
                  accessibilityLabel="Load more events"
                  onPress={() => setShownEvents(shownEvents + 3)} />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {canManage && (
        <ScrollAwareFab anim={anim} visible={visible} label="Create event" onPress={() => s.openCreateEvent()} />
      )}
    </View>
  );
}
