import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { SocialFields } from '../components/SocialLinks';
import {
  Avatar, Button, ConfirmSheet, Icon, MicroBadge, Row, SectionHeading, Segmented, VoltButton,
} from '../components/ui';
import { useSports } from '../components/useSports';
import {
  canModerate, CommunityDetail, CommunityPrivacy, decideJoinRequest, fetchCommunity,
  fetchJoinRequests, fetchMembers, fetchPhotos, isAdmin, JoinRequest, MAX_GALLERY, Member,
  Photo, removeMember, removePhoto, Role, setMemberRole, updateCommunity,
} from '../lib/communities';
import { addPhoto, setCommunityAvatar } from '../lib/communities';
import { pickAvatar, PickedAvatar } from '../lib/avatars';
import { NO_SOCIALS, SocialHandles } from '../lib/socialLinks';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, isExplicit, useStore } from '../state/store';
import { initials } from '../state/models';
import { alpha, radii, useTheme } from '../theme';

// Running a community.
//
// One screen for two different people. An admin owns the place: its name, what
// it is about, who may walk in, who holds which role. A moderator polices the
// room: they answer the queue at the door and they can show somebody out. The
// sections an admin gets and a moderator does not are not merely hidden -- the
// database refuses them too, and this screen says so rather than silently
// doing nothing.

export function CommunityManageOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const communityId = s.communityId;
  const myRole = s.currentCommunityRole(communityId) as unknown as string | undefined;
  // The store speaks upper case for the older screens; everything below this
  // line is the database's own lower-case word.
  const role = (myRole ? String(myRole).toLowerCase() : 'member') as Role;
  const admin = isAdmin(role);

  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The draft. Held apart from `detail` so a half-typed name is not what the
  // rest of the screen thinks the community is called.
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [privacy, setPrivacy] = useState<CommunityPrivacy>('open');
  const [sportId, setSportId] = useState<string | null>(null);
  const [socials, setSocials] = useState<SocialHandles>(NO_SOCIALS);

  const [dropping, setDropping] = useState<Member | null>(null);
  const [droppingPhoto, setDroppingPhoto] = useState<Photo | null>(null);

  const { sports } = useSports();

  const load = useCallback(async () => {
    if (!communityId) return;
    setError(null);
    try {
      // Sequential, not parallel, because the first read is what turns the
      // slug the store holds into the uuid every other call needs. Firing them
      // together sent "freedive" at a uuid column and the whole screen died on
      // a 22P02.
      const found = await fetchCommunity(communityId);
      setDetail(found);
      if (!found) { setMembers([]); setRequests([]); setPhotos([]); return; }

      // The rest are detail, not preconditions: a member list that fails must
      // not blank the settings.
      const [people, queue, gallery] = await Promise.all([
        fetchMembers(found.id).catch(() => [] as Member[]),
        canModerate(role) ? fetchJoinRequests(found.id).catch(() => [] as JoinRequest[]) : Promise.resolve([]),
        fetchPhotos(found.id).catch(() => [] as Photo[]),
      ]);
      setMembers(people);
      setRequests(queue);
      setPhotos(gallery);
      setName(found.name);
      setAbout(found.about);
      setPrivacy(found.privacy);
      setSportId(found.sportId);
      setSocials(found.socials);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [communityId, role]);

  useEffect(() => { void load(); }, [load]);

  const run = async (key: string, write: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await write();
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally { setBusy(null); }
  };

  // `detail.id` is the real uuid; `communityId` is whatever the store holds,
  // which is the slug. Writes use the former, always.
  const saveSettings = () => run('settings', async () => {
    if (!detail) return;
    await updateCommunity(detail.id, { name, about, privacy, sportId, socials });
    setSaved(true);
  });

  const pickPicture = (then: (picked: PickedAvatar) => Promise<void>) =>
    void (async () => {
      // A cancelled picker is not an error and must not raise one at the user.
      const picked = await pickAvatar().catch(() => null);
      if (!picked) return;
      await then(picked);
    })();

  if (!communityId) {
    return <MissingSubject title="Community" message="No community is open." onBack={s.closeOverlay} />;
  }
  if (!loading && !detail) {
    return <MissingSubject title="Community" message="This community is no longer listed." onBack={s.closeOverlay} />;
  }
  if (!canModerate(role)) {
    return (
      <MissingSubject
        title="Community"
        message="Only an admin or a moderator of this community can open its settings."
        onBack={s.closeOverlay}
      />
    );
  }

  // The same word filter the old editor ran on the description. Dropping it
  // when this screen replaced that one would have quietly removed a
  // moderation step, and the name is now editable too.
  const blocked = isExplicit(name) || isExplicit(about);

  const dirty = detail !== null && (
    name !== detail.name || about !== detail.about || privacy !== detail.privacy
    || sportId !== detail.sportId
    || socials.instagram !== detail.socials.instagram
    || socials.facebook !== detail.socials.facebook
    || socials.tiktok !== detail.socials.tiktok
  );

  return (
    <OverlayScaffold
      header={<OverlayHeader
        title="Community settings"
        subtitle={admin ? 'You are an admin' : 'You are a moderator'}
        onBack={() => { if (!busy) s.closeOverlay(); }}
      />}
      bottomBar={admin ? (
        <View style={{ padding: 16, backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: 1 }}>
          <VoltButton
            icon="check"
            busy={busy === 'settings'}
            busyLabel="Saving…"
            label={blocked ? 'Edit blocked content to continue' : 'Save changes'}
            enabled={dirty && !!name.trim() && !blocked && !busy}
            onPress={saveSettings}
          />
        </View>
      ) : undefined}
    >
      <ConfirmSheet
        visible={dropping !== null}
        title={`Remove ${dropping?.name ?? 'this person'}?`}
        body={dropping
          ? `They lose access to ${detail?.name ?? 'this community'} and anything members only. `
            + 'They can ask to join again unless you close the community.'
          : ''}
        confirmLabel="Remove them"
        busy={busy === 'kick'}
        busyLabel="Removing…"
        onConfirm={() => { if (dropping) void run('kick', async () => {
          await removeMember(detail!.id, dropping.userId);
          setDropping(null);
        }); }}
        onCancel={() => setDropping(null)}
      />
      <ConfirmSheet
        visible={droppingPhoto !== null}
        title="Remove this picture?"
        body="It comes off the community's gallery. The file is deleted."
        confirmLabel="Remove it"
        busy={busy === 'photo'}
        busyLabel="Removing…"
        onConfirm={() => { if (droppingPhoto) void run('photo', async () => {
          await removePhoto(droppingPhoto);
          setDroppingPhoto(null);
        }); }}
        onCancel={() => setDroppingPhoto(null)}
      />

      <View style={{ paddingHorizontal: 18, gap: 16, paddingBottom: 24 }}>
        {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
        {loading && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>
            Loading this community…
          </Text>
        )}
        {saved && !dirty && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.accent }]}>Saved.</Text>
        )}
        {blocked && (
          <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>
            The name or description contains blocked content. Edit it to continue; nothing has
            been sent for review.
          </Text>
        )}

        {/* ---- The queue at the door. A moderator's main job. ---- */}
        <SectionHeading>
          {requests.length ? `Asking to join · ${requests.length}` : 'Asking to join'}
        </SectionHeading>
        {requests.length === 0 ? (
          <Text style={[t.bodySm, { color: c.txt3 }]}>
            {privacy === 'open'
              ? 'This community is open, so nobody has to ask — anyone can join.'
              : 'Nobody is waiting.'}
          </Text>
        ) : requests.map((request) => (
          <View key={request.id}
            style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 12, gap: 10 }}>
            <Row gap={10} style={{ alignItems: 'center' }}>
              <Avatar initials={initials(request.name)} avatarUrl={request.avatarUrl} size={38} fontSize={14} />
              <View style={{ flex: 1 }}>
                <Text style={[t.name, { color: c.txt }]}>{request.name}</Text>
                {request.note && (
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{request.note}</Text>
                )}
              </View>
            </Row>
            <Row gap={8}>
              <Button label="Let them in" icon="check" tone="primary" enabled={!busy}
                accessibilityLabel={`Approve ${request.name}`}
                onPress={() => void run('request', () => decideJoinRequest(request.id, true))} />
              <Button label="Decline" icon="x" tone="danger" enabled={!busy}
                accessibilityLabel={`Decline ${request.name}`}
                onPress={() => void run('request', () => decideJoinRequest(request.id, false))} />
            </Row>
          </View>
        ))}

        {/* ---- People, and what they are ---- */}
        <SectionHeading style={{ marginTop: 8 }}>People · {members.length}</SectionHeading>
        {!admin && (
          <Text style={[t.caption, { color: c.txt3 }]}>
            You can remove a member. Changing what someone is here is an admin's call.
          </Text>
        )}
        {members.map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            admin={admin}
            busy={!!busy}
            onRole={(next) => void run('role', () => setMemberRole(detail!.id, member.userId, next))}
            onRemove={() => setDropping(member)}
          />
        ))}

        {admin && <>
          {/* ---- The face ---- */}
          <SectionHeading style={{ marginTop: 8 }}>Picture</SectionHeading>
          <Row gap={12} style={{ alignItems: 'center' }}>
            <Avatar
              initials={detail?.name?.slice(0, 2).toUpperCase() ?? '??'}
              avatarUrl={detail?.avatarUrl}
              size={64} radius={18} fontSize={20}
            />
            <Button
              label={detail?.avatarUrl ? 'Change picture' : 'Add a picture'}
              icon="image"
              enabled={!busy}
              onPress={() => pickPicture(async (picked) => {
                await run('avatar', async () => { await setCommunityAvatar(detail!.id, picked); });
              })}
            />
          </Row>

          <SectionHeading style={{ marginTop: 8 }}>
            Gallery · {photos.length} of {MAX_GALLERY}
          </SectionHeading>
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            Five pictures of what this community actually looks like. Everyone can see them.
          </Text>
          <Row style={{ flexWrap: 'wrap', gap: 10 }}>
            {photos.map((photo) => (
              <View key={photo.id} style={{
                flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 96, maxWidth: '32%',
                aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: c.surface2,
              }}>
                <Image source={{ uri: photo.url }} accessibilityIgnoresInvertColors
                  accessibilityLabel={photo.caption ?? 'Community picture'}
                  style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <Pressable accessibilityRole="button" accessibilityLabel="Remove this picture"
                  onPress={() => setDroppingPhoto(photo)} disabled={!!busy}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{
                    position: 'absolute', top: 4, right: 4, width: 32, height: 32, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(c.ink, 0.66),
                  }}>
                  <Icon name="trash-2" size={15} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </Row>
          {photos.length < MAX_GALLERY && (
            <Button label="Add a picture" icon="plus" full enabled={!busy}
              onPress={() => pickPicture(async (picked) => {
                await run('gallery', async () => { await addPhoto(detail!.id, picked); });
              })} />
          )}

          {/* ---- What it is ---- */}
          <SectionHeading style={{ marginTop: 8 }}>Name</SectionHeading>
          <TextInput
            value={name} onChangeText={setName} editable={!busy}
            placeholder="What this community is called" placeholderTextColor={c.txt3}
            accessibilityLabel="Community name"
            style={[t.body, {
              color: c.txt, backgroundColor: c.surface, minHeight: 48,
              borderColor: c.line, borderWidth: 1, borderRadius: radii.input, paddingHorizontal: 14,
            }]}
          />

          <SectionHeading style={{ marginTop: 8 }}>Description</SectionHeading>
          <TextInput
            value={about} onChangeText={setAbout} multiline editable={!busy}
            placeholder="What members should know before they join"
            placeholderTextColor={c.txt3} textAlignVertical="top"
            accessibilityLabel="Community description"
            style={[t.body, {
              color: c.txt, backgroundColor: c.surface, minHeight: 100,
              borderColor: c.line, borderWidth: 1, borderRadius: radii.input, padding: 14,
            }]}
          />

          {/* ---- The sport it is about ---- */}
          <SectionHeading style={{ marginTop: 8 }}>Sport or hobby</SectionHeading>
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            One, so people looking for it can find it. This is what the community is about, not
            everything its members do.
          </Text>
          <Row style={{ flexWrap: 'wrap', gap: 8 }}>
            {sports?.map((sport) => {
              const on = sportId === sport.id;
              return (
                <Pressable
                  key={sport.id}
                  onPress={() => setSportId(on ? null : sport.id)}
                  disabled={!!busy}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={sport.name}
                  style={{
                    minHeight: 44, justifyContent: 'center', paddingHorizontal: 14,
                    borderRadius: radii.pill ?? 999, borderWidth: 1,
                    borderColor: on ? c.volt : c.line,
                    backgroundColor: on ? alpha(c.volt, 0.14) : c.surface,
                  }}
                >
                  <Text style={[t.labelSm, { color: on ? c.accent : c.txt2 }]}>{sport.name}</Text>
                </Pressable>
              );
            })}
          </Row>

          {/* ---- Who may walk in ---- */}
          <SectionHeading style={{ marginTop: 8 }}>Who can join</SectionHeading>
          <Segmented
            options={[
              { key: 'open', label: 'Open' },
              { key: 'closed', label: 'Closed' },
            ]}
            selected={privacy}
            onSelect={(key) => setPrivacy(key as CommunityPrivacy)}
          />
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            {privacy === 'open'
              ? 'Anyone can join without asking.'
              : 'People ask to join, and an admin or moderator answers. Everyone already in stays in.'}
          </Text>

          <SectionHeading style={{ marginTop: 8 }}>Find us on</SectionHeading>
          <SocialFields
            value={socials} disabled={!!busy} subject="this community's"
            onChange={setSocials}
          />
        </>}
      </View>
    </OverlayScaffold>
  );
}

// One person, and what they are here. The owner is shown but not editable:
// a community has exactly one, and a trigger refuses the change regardless of
// what this screen offers.
function MemberRow({ member, admin, busy, onRole, onRemove }: {
  member: Member;
  admin: boolean;
  busy: boolean;
  onRole: (role: Exclude<Role, 'owner'>) => void;
  onRemove: () => void;
}) {
  const { c, t } = useTheme();
  const [open, setOpen] = useState(false);
  const owner = member.role === 'owner';

  return (
    <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 12, gap: 10 }}>
      <Row gap={10} style={{ alignItems: 'center' }}>
        <Avatar initials={initials(member.name)} avatarUrl={member.avatarUrl} size={38} fontSize={14} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[t.name, { color: c.txt }]}>{member.name}</Text>
        </View>
        <MicroBadge
          label={ROLE_LABEL[member.role]}
          bg={owner || member.role === 'admin' ? alpha(c.volt, 0.14) : c.surface2}
          fg={owner || member.role === 'admin' ? c.accent : c.txt2}
        />
      </Row>

      {!owner && (
        <Row gap={8}>
          {admin && (
            <Button
              label={open ? 'Done' : 'Change role'}
              icon={open ? 'check' : 'shield'}
              enabled={!busy}
              accessibilityLabel={`Change what ${member.name} is in this community`}
              onPress={() => setOpen((shown) => !shown)}
            />
          )}
          <Button label="Remove" icon="user-minus" tone="danger" enabled={!busy}
            accessibilityLabel={`Remove ${member.name}`}
            onPress={onRemove} />
        </Row>
      )}

      {open && admin && (
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {(['admin', 'moderator', 'member'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => { onRole(option); setOpen(false); }}
              disabled={busy || member.role === option}
              accessibilityRole="radio"
              accessibilityState={{ selected: member.role === option }}
              accessibilityLabel={`Make ${member.name} ${ROLE_LABEL[option].toLowerCase()}`}
              style={{
                minHeight: 44, justifyContent: 'center', paddingHorizontal: 14,
                borderRadius: 999, borderWidth: 1,
                borderColor: member.role === option ? c.volt : c.line,
                backgroundColor: member.role === option ? alpha(c.volt, 0.14) : c.surface,
              }}
            >
              <Text style={[t.labelSm, { color: member.role === option ? c.accent : c.txt2 }]}>
                {ROLE_LABEL[option]}
              </Text>
            </Pressable>
          ))}
        </Row>
      )}

      {open && admin && (
        <Text style={[t.caption, { color: c.txt3 }]}>
          An admin can change everything about the community. A moderator answers the queue at
          the door, keeps an eye on what members post, can remove a member, and runs events.
        </Text>
      )}
    </View>
  );
}

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
};
