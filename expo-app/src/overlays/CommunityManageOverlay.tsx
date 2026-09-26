import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ConfirmButton } from '../components/ItemMenu';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import {
  CommunityDraft, CommunityFields, draftDiffers, EMPTY_COMMUNITY_DRAFT,
} from '../components/CommunityFields';
import { PhotoStrip } from '../components/PhotoStrip';
import {
  Avatar, Button, ConfirmSheet, Icon, MicroBadge, Row, SectionHeading, VoltButton,
} from '../components/ui';
import {
  canModerate, CommunityDetail, decideJoinRequest, fetchCommunity,
  fetchJoinRequests, fetchMembers, fetchPhotos, isAdmin, JoinRequest, MAX_GALLERY, Member,
  Photo, removeMember, removePhoto, Role, setMemberRole, updateCommunity,
} from '../lib/communities';
import {
  deleteCommunity, fetchOfficialStatus, OfficialStatus, requestOfficialStatus,
} from '../lib/communities';
import { addPhoto, setCommunityAvatar } from '../lib/communities';
import { pickAvatar, PickedAvatar } from '../lib/avatars';
import { currentAppUserId } from '../lib/bookings';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, isExplicit, useStore } from '../state/store';
import { initials } from '../state/models';
import { alpha, useTheme } from '../theme';

// Running a community.
//
// One screen for two different people. An admin owns the place: its name, what
// it is about, who may walk in, who holds which role. A moderator polices the
// room: they answer the queue at the door and they can show somebody out. The
// sections an admin gets and a moderator does not are not merely hidden -- the
// database refuses them too, and this screen says so rather than silently
// doing nothing.

/** The saved community, as a draft. One place that mapping lives, so the
 *  dirty-check and the save diff cannot disagree about what "unchanged" means. */
function draftOf(found: CommunityDetail): CommunityDraft {
  return {
    name: found.name,
    about: found.about,
    privacy: found.privacy,
    sportId: found.sportId,
    chatMode: found.chatMode,
    socials: found.socials,
  };
}

export function CommunityManageOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const communityId = s.communityId;
  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The draft. Held apart from `detail` so a half-typed name is not what the
  // rest of the screen thinks the community is called.
  //
  // One object rather than six states because the create screen now renders the
  // very same fields, and the shared component takes a draft. Two forms for the
  // same thing that do not share their shape is how they drift apart.
  const [draft, setDraft] = useState<CommunityDraft>(EMPTY_COMMUNITY_DRAFT);

  const [dropping, setDropping] = useState<Member | null>(null);
  const [official, setOfficial] = useState<OfficialStatus>('none');
  const [deleting, setDeleting] = useState(false);


  // The store cannot answer "am I the owner". `roleFromDb` collapses 'owner'
  // and 'admin' into a single 'ADMIN', so `currentCommunityRole` never returns
  // owner -- which meant the Delete section, gated on it, rendered for nobody
  // and the owner was told "only the owner can delete this community".
  //
  // The member list this screen already loads carries the real roles, so the
  // answer comes from there.
  useEffect(() => {
    let active = true;
    currentAppUserId()
      .then((id) => { if (active) setMeId(id); })
      .catch(() => { if (active) setMeId(null); });
    return () => { active = false; };
  }, []);

  const role: Role = members.find((member) => member.userId === meId)?.role
    // Until the member list lands, fall back to the store's coarser answer so
    // the screen is not briefly a refusal. It cannot say 'owner', which is why
    // the destructive section waits for the real thing.
    ?? (String(s.currentCommunityRole(communityId) ?? 'member').toLowerCase() as Role);
  const admin = isAdmin(role);
  const owner = members.find((member) => member.userId === meId)?.role === 'owner';

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
      setDraft(draftOf(found));
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
    const saved = draftOf(detail);
    const changes: Parameters<typeof updateCommunity>[1] = {};
    if (draft.name !== saved.name) changes.name = draft.name;
    if (draft.about !== saved.about) changes.about = draft.about;
    if (draft.privacy !== saved.privacy) changes.privacy = draft.privacy;
    if (draft.sportId !== saved.sportId) changes.sportId = draft.sportId;
    if (
      draft.socials.instagram !== saved.socials.instagram
      || draft.socials.facebook !== saved.socials.facebook
      || draft.socials.tiktok !== saved.socials.tiktok
    ) changes.socials = draft.socials;
    if (draft.chatMode !== saved.chatMode) changes.chatMode = draft.chatMode;
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
  const blocked = isExplicit(draft.name) || isExplicit(draft.about);

  const dirty = detail !== null && draftDiffers(draft, draftOf(detail));

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
            enabled={dirty && !!draft.name.trim() && !blocked && !busy}
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
            // The store keeps its own copy of the list, so the deleted
            // community stayed on screen after the server had removed it --
            // which reads as the delete having failed.
            s.forgetCommunity(communityId);
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
            {/* The saved value, not the draft: flicking the segment to closed
                without saving does not start a queue, so it must not claim one. */}
            {detail?.privacy === 'open'
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

          {/* The same fields the create screen shows, from the same component --
              so a field added to one is a field on both. */}
          <CommunityFields value={draft} onChange={setDraft} busy={!!busy} />

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
        {owner && (
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
        {!owner && admin && meId !== null && (
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
