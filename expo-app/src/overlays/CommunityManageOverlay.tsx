import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ConfirmButton } from '../components/ItemMenu';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { PhotoStrip } from '../components/PhotoStrip';
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
import {
  deleteCommunity, fetchOfficialStatus, OfficialStatus, requestOfficialStatus,
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
  const [official, setOfficial] = useState<OfficialStatus>('none');
  const [deleting, setDeleting] = useState(false);

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
      setOfficial(await fetchOfficialStatus(found.id).catch(() => 'none' as OfficialStatus));
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
  // Only what actually changed. A PATCH naming a column the caller never
  // touched is still a write to that column as far as the grants are
  // concerned, and `authenticated` may not write every column here -- so
  // sending an unchanged name turned a description edit into a 403 and lost
  // the description with it.
  const saveSettings = () => run('settings', async () => {
    if (!detail) return;
    const changes: Parameters<typeof updateCommunity>[1] = {};
    if (name !== detail.name) changes.name = name;
    if (about !== detail.about) changes.about = about;
    if (privacy !== detail.privacy) changes.privacy = privacy;
    if (sportId !== detail.sportId) changes.sportId = sportId;
    if (
      socials.instagram !== detail.socials.instagram
      || socials.facebook !== detail.socials.facebook
      || socials.tiktok !== detail.socials.tiktok
    ) changes.socials = socials;
    await updateCommunity(detail.id, changes);
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
        visible={deleting}
        title={`Delete ${detail?.name ?? 'this community'}?`}
        body={
          `${members.length} ${members.length === 1 ? 'member' : 'members'}, every event, the `
          + 'gallery and anyone waiting to join are deleted with it. This cannot be undone.'
        }
        confirmLabel="Delete it"
        busy={busy === 'delete'}
        busyLabel="Deleting…"
        onConfirm={() => void (async () => {
          setBusy('delete');
          setError(null);
          try {
            await deleteCommunity(detail!.id);
            setDeleting(false);
            // Nothing to come back to: the screen behind this one is a
            // community that no longer exists.
            s.set('overlay', null);
            s.set('communityId', '');
          } catch (e) {
            track('write_failed', { error_code: analyticsErrorCode(e) });
            setError(errorMessage(e));
          } finally { setBusy(null); }
        })()}
        onCancel={() => setDeleting(false)}
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
              {/* Turning somebody away reaches them and cannot be taken back
                  from here, so it asks. Letting them in stays one press. */}
              <ConfirmButton label="Decline" icon="x" enabled={!busy}
                accessibilityLabel={`Decline ${request.name}`}
                confirm={{
                  title: `Decline ${request.name}?`,
                  body: 'They are told their request was turned down. They can ask again later.',
                  confirmLabel: 'Decline',
                }}
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
          <PhotoStrip
            photos={photos}
            label={`${detail?.name ?? 'This community'} gallery`}
            busy={!!busy}
            // PhotoStrip's hold-menu asks before it calls this, so the
            // removal runs straight away rather than opening a second sheet.
            onRemove={(photo) => {
              const found = photos.find((candidate) => candidate.id === photo.id);
              if (found) void run('photo', () => removePhoto(found));
            }}
          />

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

          {/* ---- Accreditation ---- */}
          <SectionHeading style={{ marginTop: 8 }}>Official status</SectionHeading>
          {detail?.official ? (
            <Row gap={8} style={{ alignItems: 'center' }}>
              <Icon name="check-circle" size={16} color={c.accent} />
              <Text style={[t.bodySm, { color: c.txt2, flex: 1 }]}>
                This community is accredited. The tick shows on its page.
              </Text>
            </Row>
          ) : official === 'pending' ? (
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              Asked. A BOOK&apos;D admin reviews it — you will see the tick here when it is
              granted.
            </Text>
          ) : (
            <>
              <Text style={[t.bodySm, { color: c.txt2 }]}>
                {official === 'rejected'
                  ? 'The last request was turned down. You can ask again if something has changed.'
                  : 'Ask BOOK’D to verify that this community is what it says it is. '
                    + 'Accredited communities carry a tick and are easier to trust.'}
              </Text>
              <Button
                label={official === 'rejected' ? 'Ask again' : 'Request accreditation'}
                icon="award"
                full
                enabled={!busy}
                busy={busy === 'official'}
                busyLabel="Sending…"
                onPress={() => void run('official', () => requestOfficialStatus(detail!.id))}
              />
            </>
          )}
        </>}

        {/* ---- Ending it. Owner only, and last, because it is the one thing
                on this screen that cannot be undone. ---- */}
        {role === 'owner' && (
          <>
            <SectionHeading style={{ marginTop: 18 }}>Delete this community</SectionHeading>
            <Text style={[t.bodySm, { color: c.txt2 }]}>
              Everything goes: every member, every event, the gallery, and anyone waiting to
              join. It cannot be undone, and the name becomes free for somebody else to take.
            </Text>
            <Button
              label="Delete this community"
              icon="trash-2"
              tone="danger"
              full
              enabled={!busy}
              onPress={() => setDeleting(true)}
            />
          </>
        )}
        {role !== 'owner' && admin && (
          <Text style={[t.caption, { color: c.txt3, marginTop: 18 }]}>
            Only the owner can delete this community.
          </Text>
        )}
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
