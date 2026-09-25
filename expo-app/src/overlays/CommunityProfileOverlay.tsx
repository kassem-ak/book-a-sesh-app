import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MissingSubject, OverlayHeader } from '../components/Overlay';
import { ScrollAwareFab, useScrollAwareFab } from '../components/ScrollAwareFab';
import {
  Avatar, Button, Card, Icon, IconButton, MicroBadge, Row, StripedPlaceholder,
} from '../components/ui';
import { PhotoStrip } from '../components/PhotoStrip';
import { SocialRow } from '../components/SocialLinks';
import { CommunityDetail, fetchCommunity, fetchPhotos, Photo } from '../lib/communities';
import { hasAnyHandle } from '../lib/socialLinks';
import { useSports } from '../components/useSports';
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

  // The parts a community gained after the store's Community shape was
  // written: its picture, what it is about, who may walk in, its gallery and
  // its accounts. Read here rather than widened into the list query, so a
  // failure costs this section and not the whole Communities tab.
  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { sports } = useSports();
  const detailId = cm?.id ?? null;
  useEffect(() => {
    if (!detailId) { setDetail(null); setPhotos([]); return; }
    let active = true;
    // The gallery is keyed by the community's uuid, and `detailId` is the slug
    // the store holds -- so it has to wait for the row that carries the real
    // one. Fired in parallel it asked for photos of "freedive" and got a uuid
    // cast error instead of a gallery.
    void (async () => {
      const found = await fetchCommunity(detailId).catch(() => null);
      if (!active) return;
      setDetail(found);
      if (!found) { setPhotos([]); return; }
      const gallery = await fetchPhotos(found.id).catch(() => [] as Photo[]);
      if (active) setPhotos(gallery);
    })();
    return () => { active = false; };
  }, [detailId]);


  // After the hooks so hook order is stable: a community id that is not in the
  // fetched list used to resolve to an invented sample community.
  if (!cm) return <MissingSubject title="Community" message="This community is no longer listed." onBack={s.closeOverlay} />;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top }}>
        {/* `detail.name` is this community as it is now; `cm.sport` is the
            Communities list as it was when that tab last loaded. After a
            rename the two disagree, and the stale one was winning. */}
        <OverlayHeader title={detail?.name || cm.sport} onBack={s.closeOverlay}
          // The edit control was threaded between the community name and its
          // verified tick, inside the identity line. A screen's own action
          // belongs in its header, not in the middle of its title.
          trailing={canManage ? (
            <IconButton icon="edit-2" accessibilityLabel="Edit community details"
              onPress={() => s.openEditCommunity()} />
          ) : undefined} />
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
              <Avatar initials={cm.code} avatarUrl={detail?.avatarUrl} size={58} radius={17}
                bg={cm.tint} fontSize={18} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Row gap={8} style={{ alignItems: 'flex-start' }}>
                  <Text style={[t.overlayTitle, { color: c.txt, flex: 1 }]}>
                    {detail?.name || cm.sport}
                  </Text>
                  {/* Verified check belongs to official communities only — it
                      was rendering unconditionally, next to a missing badge. */}
                  {cm.official && <Icon name="check-circle" size={17} color={c.accent} />}
                </Row>
                <Row gap={8} style={{ marginTop: 6, flexWrap: 'wrap' }}>
                  {cm.official && <MicroBadge label="Official Federation" bg={alpha(c.volt, 0.12)} fg={c.accent} />}
                  {/* Worth saying before somebody presses Join and gets a wait
                      instead of a welcome. */}
                  {detail?.privacy === 'closed' && (
                    <MicroBadge label="Closed" bg={c.surface2} fg={c.txt2} />
                  )}
                  <Text style={[t.labelSm, { color: c.soft }]}>{cm.members} Members</Text>
                </Row>
                {/* What this community is actually about, once an admin has
                    said. The old line repeated the community's own name back
                    at the reader. */}
                <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>
                  {sports?.find((sport) => sport.id === detail?.sportId)?.name ?? 'No sport set yet'}
                </Text>
              </View>
            </Row>

            <Text style={[t.caption, { color: c.txt3, marginTop: 13, letterSpacing: 0.4 }]}>Bio:</Text>
            <Text style={[t.bodySm, { color: c.soft, marginTop: 3, lineHeight: 20 }]}>
              {detail?.about || cm.about}
            </Text>

            {detail && hasAnyHandle(detail.socials) && (
              <View style={{ marginTop: 13 }}>
                <SocialRow handles={detail.socials} name={detail.name || cm.sport} />
              </View>
            )}
          </Card>

          {/* The thread sits under the identity block, where somebody who has
              just read what the community is goes next. */}
          <Button
            label={detail?.chatMode === 'newsletter' ? 'Announcements' : 'Community chat'}
            icon="message-circle"
            full
            style={{ marginTop: 12 }}
            accessibilityLabel={`Open the ${detail?.name || cm.sport} community thread`}
            onPress={() => s.set('overlay', 'communityChat')}
          />

          {/* Five slots wide, always. The tile is the row divided by five,
              measured rather than guessed -- so the strip looks the same
              whether it holds one picture or five, and a tap opens the
              picture full size. */}
          {photos.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <PhotoStrip
                photos={photos}
                label={`${detail?.name || cm.sport} gallery`}
                emptySlots={false}
              />
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
