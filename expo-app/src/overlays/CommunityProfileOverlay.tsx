import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MissingSubject, OverlayHeader } from '../components/Overlay';
import { ScrollAwareFab, useScrollAwareFab } from '../components/ScrollAwareFab';
import {
  Avatar, Button, Card, Icon, IconButton, MicroBadge, Row, SectionHeading, StripedPlaceholder,
} from '../components/ui';
import { HoldableItem, SafeItemAction } from '../components/ItemMenu';
import { PhotoStrip } from '../components/PhotoStrip';
import { SocialRow } from '../components/SocialLinks';
import {
  canModerate, CommunityDetail, fetchCommunity, fetchMembers, fetchPhotos, isAdmin, Member,
  Photo, removeMember, Role, setMemberRole,
} from '../lib/communities';
import { currentAppUserId } from '../lib/bookings';
import { hasAnyHandle } from '../lib/socialLinks';
import { useSports } from '../components/useSports';
import { initials, isMeetup } from '../state/models';
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
  // Who is here. Members only -- `member_read` refuses a non-member, so this
  // comes back empty for them rather than needing a second rule in the client.
  const [members, setMembers] = useState<Member[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [memberBusy, setMemberBusy] = useState<string | null>(null);
  const [reloadMembers, setReloadMembers] = useState(0);
  const detailId = cm?.id ?? null;

  useEffect(() => {
    let active = true;
    currentAppUserId().then((id) => { if (active) setMeId(id); }).catch(() => {});
    return () => { active = false; };
  }, []);
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
      const [gallery, people] = await Promise.all([
        fetchPhotos(found.id).catch(() => [] as Photo[]),
        fetchMembers(found.id).catch(() => [] as Member[]),
      ]);
      if (!active) return;
      setPhotos(gallery);
      setMembers(people);
    })();
    return () => { active = false; };
  }, [detailId, reloadMembers]);


  // My own role, from the list itself rather than the store -- the store
  // collapses owner and admin into one word and cannot answer "am I the
  // owner", which is the bug that hid the delete button on the settings
  // screen.
  const myRole: Role | null = members.find((member) => member.userId === meId)?.role ?? null;

  const act = async (userId: string, write: () => Promise<void>) => {
    setMemberBusy(userId);
    try {
      await write();
      setReloadMembers((n) => n + 1);
    } catch (e) {
      s.set('writeError', e instanceof Error ? e.message : 'That did not work.');
    } finally { setMemberBusy(null); }
  };

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

          {/* Who is here.
              Members only, and enforced in the database rather than here:
              `member_read` refuses a non-member, so this list simply comes back
              empty for them and there is no second rule in the client to keep
              in step with the first. */}
          {members.length > 0 && (
            <>
              <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>
                Members · {members.length}
              </SectionHeading>
              <View style={{ gap: 10 }}>
                {members.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    mine={member.userId === meId}
                    // Admins and moderators manage the room. A plain member
                    // sees exactly the same list and no way to act on it.
                    manages={canModerate(myRole)}
                    admin={isAdmin(myRole)}
                    busy={memberBusy === member.userId}
                    onOpen={() => s.openPerson(member.userId)}
                    onRole={(next: Exclude<Role, 'owner'>) => void act(member.userId, () =>
                      setMemberRole(detail!.id, member.userId, next))}
                    onRemove={() => void act(member.userId, () =>
                      removeMember(detail!.id, member.userId))}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {canManage && (
        <ScrollAwareFab anim={anim} visible={visible} label="Create event" onPress={() => s.openCreateEvent()} />
      )}
    </View>
  );
}

// One member, and what can be done to them.
//
// Everybody in the community sees the same list. Only an admin or moderator
// gets the menu, and only an admin sees the role entries -- a moderator
// polices the room, they do not decide who runs it. The database enforces both
// regardless of what this renders.
function MemberRow({ member, mine, manages, admin, busy, onOpen, onRole, onRemove }: {
  member: Member;
  mine: boolean;
  manages: boolean;
  admin: boolean;
  busy: boolean;
  onOpen: () => void;
  onRole: (role: Exclude<Role, 'owner'>) => void;
  onRemove: () => void;
}) {
  const { c, t } = useTheme();
  const owner = member.role === 'owner';

  const actions: SafeItemAction[] = !manages || mine ? [] : [
    { key: 'open', label: 'Open their profile', icon: 'user', onPress: onOpen },
    ...(admin && !owner ? (['admin', 'moderator', 'member'] as const)
      .filter((role) => role !== member.role)
      .map((role) => ({
        key: `role-${role}`,
        label: `Make them ${ROLE_LABEL[role].toLowerCase()}`,
        icon: 'shield' as const,
        onPress: () => onRole(role),
      })) : []),
    ...(owner ? [] : [{
      key: 'remove',
      label: 'Remove from the community',
      icon: 'user-minus' as const,
      destructive: true as const,
      confirm: {
        title: `Remove ${member.name}?`,
        body: 'They lose access to members-only events and posts. If the community is closed '
          + 'they will have to ask to join again.',
        confirmLabel: 'Remove them',
      },
      onPress: onRemove,
    }]),
  ];

  const body = (
    <Row gap={10} style={{ alignItems: 'center', paddingVertical: 2 }}>
      <Avatar initials={initials(member.name)} avatarUrl={member.avatarUrl} size={38} fontSize={14} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[t.name, { color: c.txt }]}>{member.name}</Text>
      </View>
      {mine && <MicroBadge label="You" bg={c.surface2} fg={c.txt2} />}
      {member.role !== 'member' && (
        <MicroBadge
          label={ROLE_LABEL[member.role]}
          bg={alpha(c.volt, 0.14)}
          fg={c.accent}
        />
      )}
    </Row>
  );

  // A member with nothing to do to this row gets a plain press that opens the
  // profile, not a menu whose only entry is the thing pressing already does.
  if (!actions.length) {
    return (
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${member.name}, ${ROLE_LABEL[member.role].toLowerCase()}`}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <HoldableItem
      actions={actions}
      onPress={onOpen}
      busy={busy}
      morePlacement="inline"
      menuTitle={member.name}
      menuSubtitle={ROLE_LABEL[member.role]}
      accessibilityLabel={`${member.name}, ${ROLE_LABEL[member.role].toLowerCase()}`}
    >
      {body}
    </HoldableItem>
  );
}

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
};
