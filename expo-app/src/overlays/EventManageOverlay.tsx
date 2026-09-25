import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { ConfirmIconButton } from '../components/ItemMenu';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import {
  Avatar, Button, ConfirmSheet, Field, Icon, MicroBadge, Row, SectionHeading, VoltButton,
} from '../components/ui';
import { pickAvatar, PickedAvatar } from '../lib/avatars';
import {
  addEventPhoto, canInvite, EventDetail, EventPhoto, EventPrivacy, fetchEvent,
  fetchEventPhotos, fetchInvitations, feeLabel, INVITE_CHOICES, InvitePolicy, Invitation,
  inviteToEvent, MAX_EVENT_PHOTOS, PRIVACY_CHOICES, removeEventPhoto, setEventCover,
  updateEvent, withdrawInvitation,
} from '../lib/events';
import { deleteEvent } from '../lib/events';
import { canModerate, Role } from '../lib/communities';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, isExplicit, useStore } from '../state/store';
import { initials } from '../state/models';
import { alpha, radii, useTheme } from '../theme';

// Running one event.
//
// Admins and moderators both get this: the spec puts events in a moderator's
// hands alongside policing the room, and `event_manage` has always been gated
// on can_manage_community rather than on ownership.

export function EventManageOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const eventId = s.eventId;

  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The draft, held apart from `detail` so a half-typed title is not what the
  // rest of the screen thinks the event is called.
  const [title, setTitle] = useState('');
  const [whenLabel, setWhenLabel] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<EventPrivacy>('public');
  const [invitePolicy, setInvitePolicy] = useState<InvitePolicy>('managers');
  // Kept as the string the person typed. Parsing on every keystroke turns
  // "1" into 1 and then back into "1" while they are still typing "15".
  const [feeText, setFeeText] = useState('');

  const [dropping, setDropping] = useState<EventPhoto | null>(null);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The community the event belongs to decides who may run it. The store keys
  // roles by slug; `communityId` on the row is the uuid, so the community the
  // user came through is what says whether they manage this.
  const role = String(s.currentCommunityRole(s.communityId) ?? 'member').toLowerCase() as Role;

  const load = useCallback(async () => {
    if (!eventId) return;
    setError(null);
    try {
      const found = await fetchEvent(eventId);
      setDetail(found);
      if (!found) { setPhotos([]); setInvites([]); return; }
      setTitle(found.title);
      setWhenLabel(found.whenLabel);
      setLocation(found.location);
      setDescription(found.description);
      setPrivacy(found.privacy);
      setInvitePolicy(found.invitePolicy);
      setFeeText(found.feeCents > 0 ? String(found.feeCents / 100) : '');
      // Detail, not preconditions: a gallery that fails must not blank the form.
      const [gallery, invited] = await Promise.all([
        fetchEventPhotos(found.id).catch(() => [] as EventPhoto[]),
        fetchInvitations(found.id).catch(() => [] as Invitation[]),
      ]);
      setPhotos(gallery);
      setInvites(invited);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

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

  const pickPicture = (then: (picked: PickedAvatar) => Promise<void>) =>
    void (async () => {
      const picked = await pickAvatar().catch(() => null);
      if (!picked) return;
      await then(picked);
    })();

  if (!eventId) {
    return <MissingSubject title="Event" message="No event is open." onBack={s.closeOverlay} />;
  }
  if (!loading && !detail) {
    return <MissingSubject title="Event" message="This event is no longer listed." onBack={s.closeOverlay} />;
  }
  if (!canModerate(role)) {
    return (
      <MissingSubject
        title="Event"
        message="Only an admin or a moderator of this community can change an event."
        onBack={s.closeOverlay}
      />
    );
  }

  // Blank means free. A fee people cannot read is a fee they will argue about.
  const feeCents = feeText.trim() === '' ? 0 : Math.round(Number(feeText.replace(',', '.')) * 100);
  const feeBroken = feeText.trim() !== '' && (!Number.isFinite(feeCents) || feeCents < 0);
  const blocked = isExplicit(title) || isExplicit(description);

  const dirty = detail !== null && (
    title !== detail.title || whenLabel !== detail.whenLabel || location !== detail.location
    || description !== detail.description || privacy !== detail.privacy
    || invitePolicy !== detail.invitePolicy || feeCents !== detail.feeCents
  );

  const save = () => run('settings', async () => {
    if (!detail) return;
    const changes: Parameters<typeof updateEvent>[1] = {};
    if (title !== detail.title) changes.title = title;
    if (whenLabel !== detail.whenLabel) changes.whenLabel = whenLabel;
    if (location !== detail.location) changes.location = location;
    if (description !== detail.description) changes.description = description;
    if (privacy !== detail.privacy) changes.privacy = privacy;
    if (invitePolicy !== detail.invitePolicy) changes.invitePolicy = invitePolicy;
    if (feeCents !== detail.feeCents) changes.feeCents = feeCents;
    await updateEvent(detail.id, changes);
    setSaved(true);
  });

  return (
    <OverlayScaffold
      header={<OverlayHeader
        title="Event settings"
        subtitle={detail?.title}
        onBack={() => { if (!busy) s.set('overlay', s.returnTo || 'communityProfile'); }}
      />}
      bottomBar={
        <View style={{ padding: 16, backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: 1 }}>
          <VoltButton
            icon="check"
            busy={busy === 'settings'}
            busyLabel="Saving…"
            label={blocked ? 'Edit blocked content to continue' : 'Save changes'}
            enabled={dirty && !!title.trim() && !blocked && !feeBroken && !busy}
            onPress={save}
          />
        </View>
      }
    >
      <ConfirmSheet
        visible={deleting}
        title={`Delete ${detail?.title ?? 'this event'}?`}
        body={
          `${detail?.attendeesCount ?? 0} `
          + `${(detail?.attendeesCount ?? 0) === 1 ? 'person is' : 'people are'} going. `
          + 'The event, its gallery and every invitation are deleted, and it disappears from '
          + 'their calendars. This cannot be undone.'
        }
        confirmLabel="Delete it"
        busy={busy === 'delete'}
        busyLabel="Deleting…"
        onConfirm={() => void (async () => {
          setBusy('delete');
          setError(null);
          try {
            await deleteEvent(detail!.id);
            setDeleting(false);
            // The store keeps its own copy of the event lists; without this
            // the deleted event stays on the community page behind us.
            s.forgetEvent(detail!.id);
            // The screen behind this one is an event that no longer exists.
            s.set('overlay', s.returnTo || 'communityProfile');
            s.set('eventId', '');
          } catch (e) {
            track('write_failed', { error_code: analyticsErrorCode(e) });
            setError(errorMessage(e));
          } finally { setBusy(null); }
        })()}
        onCancel={() => setDeleting(false)}
      />
      <ConfirmSheet
        visible={dropping !== null}
        title="Remove this picture?"
        body="It comes off the event's gallery. The file is deleted."
        confirmLabel="Remove it"
        busy={busy === 'photo'}
        busyLabel="Removing…"
        onConfirm={() => { if (dropping) void run('photo', async () => {
          await removeEventPhoto(dropping);
          setDropping(null);
        }); }}
        onCancel={() => setDropping(null)}
      />

      <InvitePicker
        visible={inviting}
        eventId={detail?.id ?? ''}
        already={invites.map((invite) => invite.userId)}
        onClose={() => setInviting(false)}
        onInvited={() => { setInviting(false); void load(); }}
      />

      <View style={{ paddingHorizontal: 18, gap: 16, paddingBottom: 24 }}>
        {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
        {loading && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading this event…</Text>
        )}
        {saved && !dirty && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.accent }]}>Saved.</Text>
        )}
        {blocked && (
          <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>
            The title or description contains blocked content. Edit it to continue; nothing has
            been sent for review.
          </Text>
        )}

        <SectionHeading>Title</SectionHeading>
        <Field value={title} onChange={setTitle} placeholder="What is happening" label="Event title" />

        <SectionHeading>When</SectionHeading>
        <Field value={whenLabel} onChange={setWhenLabel} placeholder="SAT 04 OCT · 9:00 AM" label="When it happens" />

        <SectionHeading>Where</SectionHeading>
        <Field value={location} onChange={setLocation} placeholder="Where to meet" label="Where it happens" />

        <SectionHeading>Description</SectionHeading>
        <TextInput
          value={description} onChangeText={setDescription} multiline editable={!busy}
          placeholder="What to expect, what to bring, who it is for"
          placeholderTextColor={c.txt3} textAlignVertical="top"
          accessibilityLabel="Event description"
          style={[t.body, {
            color: c.txt, backgroundColor: c.surface, minHeight: 100,
            borderColor: c.line, borderWidth: 1, borderRadius: radii.input, padding: 14,
          }]}
        />

        {/* ---- Who can see it ---- */}
        <SectionHeading style={{ marginTop: 8 }}>Who can see this</SectionHeading>
        <ChoiceList
          choices={PRIVACY_CHOICES}
          selected={privacy}
          busy={!!busy}
          onSelect={(key) => setPrivacy(key as EventPrivacy)}
        />

        {/* ---- Who can bring someone ---- */}
        <SectionHeading style={{ marginTop: 8 }}>Who can invite</SectionHeading>
        <ChoiceList
          choices={INVITE_CHOICES}
          selected={invitePolicy}
          busy={!!busy}
          onSelect={(key) => setInvitePolicy(key as InvitePolicy)}
        />

        {/* ---- The price ---- */}
        <SectionHeading style={{ marginTop: 8 }}>Participation fee</SectionHeading>
        <Row gap={10} style={{ alignItems: 'center' }}>
          <Text style={[t.priceSm, { color: c.txt2 }]}>$</Text>
          <Field
            value={feeText}
            onChange={setFeeText}
            placeholder="0"
            keyboardType="decimal-pad"
            width={120}
            label="Fee per person"
          />
          <Text style={[t.bodySm, { color: c.txt3, flex: 1 }]}>
            {feeText.trim() === '' ? 'Free to attend.' : `${feeLabel(feeCents)} per person.`}
          </Text>
        </Row>
        {feeBroken && (
          <Text accessibilityRole="alert" style={[t.caption, { color: c.danger }]}>
            That is not an amount.
          </Text>
        )}
        {feeCents > 0 && (
          <Text style={[t.caption, { color: c.amberText }]}>
            BOOK&apos;D cannot take the money yet. Anyone who says they are coming will sit as
            awaiting payment until an admin or moderator marks them paid, so settle it directly
            with them.
          </Text>
        )}

        {/* ---- Pictures ---- */}
        <SectionHeading style={{ marginTop: 8 }}>Cover picture</SectionHeading>
        <Row gap={12} style={{ alignItems: 'center' }}>
          <View style={{
            width: 96, height: 60, borderRadius: 12, overflow: 'hidden',
            backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center',
          }}>
            {detail?.coverUrl
              ? <Image source={{ uri: detail.coverUrl }} accessibilityIgnoresInvertColors
                  accessibilityLabel="Event cover" style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <Icon name="image" size={20} color={c.txt3} />}
          </View>
          <Button
            label={detail?.coverUrl ? 'Change cover' : 'Add a cover'}
            icon="image"
            enabled={!busy}
            onPress={() => pickPicture(async (picked) => {
              await run('cover', async () => { await setEventCover(detail!.id, picked); });
            })}
          />
        </Row>

        <SectionHeading style={{ marginTop: 8 }}>
          Gallery · {photos.length} of {MAX_EVENT_PHOTOS}
        </SectionHeading>
        <Text style={[t.bodySm, { color: c.txt2 }]}>
          Pictures from this event. Anyone who can see the event can see these.
        </Text>
        <Row style={{ flexWrap: 'wrap', gap: 10 }}>
          {photos.map((photo) => (
            <View key={photo.id} style={{
              flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 96, maxWidth: '32%',
              aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: c.surface2,
            }}>
              <Image source={{ uri: photo.url }} accessibilityIgnoresInvertColors
                accessibilityLabel={photo.caption ?? 'Event picture'}
                style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <Pressable accessibilityRole="button" accessibilityLabel="Remove this picture"
                onPress={() => setDropping(photo)} disabled={!!busy}
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
        {photos.length < MAX_EVENT_PHOTOS && (
          <Button label="Add a picture" icon="plus" full enabled={!busy}
            onPress={() => pickPicture(async (picked) => {
              await run('gallery', async () => { await addEventPhoto(detail!.id, picked); });
            })} />
        )}

        {/* ---- Invitations ---- */}
        <SectionHeading style={{ marginTop: 8 }}>
          {invites.length ? `Invited · ${invites.length}` : 'Invited'}
        </SectionHeading>
        {privacy === 'invite' && (
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            This event is hidden from everyone except the people invited here, and the admins and
            moderators of the community.
          </Text>
        )}
        {invites.length === 0 && (
          <Text style={[t.bodySm, { color: c.txt3 }]}>Nobody invited yet.</Text>
        )}
        {invites.map((invite) => (
          <Row key={invite.id} gap={10} style={{ alignItems: 'center' }}>
            <Avatar initials={initials(invite.name)} avatarUrl={invite.avatarUrl} size={36} fontSize={13} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[t.name, { color: c.txt }]}>{invite.name}</Text>
            </View>
            <MicroBadge
              label={invite.status === 'approved' ? 'Coming'
                : invite.status === 'rejected' ? 'Declined' : 'Asked'}
              bg={invite.status === 'approved' ? alpha(c.volt, 0.14) : c.surface2}
              fg={invite.status === 'approved' ? c.accent : c.txt2}
            />
            <ConfirmIconButton
              icon="x"
              accessibilityLabel={`Withdraw the invitation to ${invite.name}`}
              confirm={{
                title: `Withdraw the invitation to ${invite.name}?`,
                body: 'They stop being able to see this event if it is invitation only.',
                confirmLabel: 'Withdraw it',
              }}
              busy={!!busy}
              onPress={() => void run('invite', () => withdrawInvitation(invite.id))}
            />
          </Row>
        ))}
        <Button label="Invite someone" icon="user-plus" full enabled={!busy}
          onPress={() => setInviting(true)} />

        {/* Last, because it is the one thing here that cannot be undone. */}
        <SectionHeading style={{ marginTop: 18 }}>Delete this event</SectionHeading>
        <Text style={[t.bodySm, { color: c.txt2 }]}>
          The event, its gallery and every invitation go with it, and it disappears from the
          calendars of everyone who said they were coming.
        </Text>
        <Button
          label="Delete this event"
          icon="trash-2"
          tone="danger"
          full
          enabled={!busy}
          onPress={() => setDeleting(true)}
        />
      </View>
    </OverlayScaffold>
  );
}

// A radio list where each choice carries its own sentence. A segmented control
// would fit the three privacy options and say nothing about what they mean,
// and "Members" versus "Invited only" is not self-evident.
function ChoiceList({ choices, selected, busy, onSelect }: {
  choices: { key: string; label: string; blurb: string }[];
  selected: string;
  busy: boolean;
  onSelect: (key: string) => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {choices.map((choice) => {
        const on = selected === choice.key;
        return (
          <Pressable
            key={choice.key}
            onPress={() => onSelect(choice.key)}
            disabled={busy}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${choice.label}. ${choice.blurb}`}
            style={{
              minHeight: 48, padding: 12, borderRadius: radii.input, borderWidth: 1,
              borderColor: on ? c.volt : c.line,
              backgroundColor: on ? alpha(c.volt, 0.1) : c.surface,
            }}
          >
            <Row gap={8} style={{ alignItems: 'center' }}>
              <Icon name={on ? 'check-circle' : 'circle'} size={16} color={on ? c.accent : c.txt3} />
              <Text style={[t.labelSm, { color: on ? c.accent : c.txt }]}>{choice.label}</Text>
            </Row>
            <Text style={[t.caption, { color: c.txt2, marginTop: 4, marginLeft: 24 }]}>
              {choice.blurb}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Anyone on the app, which is what "invitations can be shared with anyone on
// the app" means. The list is the people already loaded for Discover -- a
// separate directory read would be a second source of truth for who exists.
function InvitePicker({ visible, eventId, already, onClose, onInvited }: {
  visible: boolean;
  eventId: string;
  already: string[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const { c, t } = useTheme();
  const s = useStore();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  const needle = query.trim().toLowerCase();
  const people = s.people()
    .filter((person) => !already.includes(person.id))
    .filter((person) => !needle || person.name.toLowerCase().includes(needle))
    .slice(0, 30);

  const invite = (userId: string, name: string) => void (async () => {
    setBusy(userId);
    setError(null);
    try {
      await inviteToEvent(eventId, userId);
      track('write_failed', { error_code: 'none' });
      onInvited();
    } catch (e) {
      setError(`${name}: ${errorMessage(e)}`);
    } finally { setBusy(null); }
  })();

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: c.bg, zIndex: 20,
    }}>
      <OverlayScaffold header={<OverlayHeader title="Invite someone" onBack={onClose} />}>
        <View style={{ paddingHorizontal: 18, gap: 12 }}>
          {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
          <Field value={query} onChange={setQuery} placeholder="Search by name" icon="search"
            label="Search people" />
          {people.length === 0 && (
            <Text style={[t.bodySm, { color: c.txt3 }]}>
              {needle ? 'Nobody by that name.' : 'Everyone here has already been invited.'}
            </Text>
          )}
          {people.map((person) => (
            <Row key={person.id} gap={10} style={{ alignItems: 'center' }}>
              <Avatar initials={initials(person.name)} avatarUrl={person.avatarUrl} size={38} fontSize={14} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[t.name, { color: c.txt }]}>{person.name}</Text>
                <Text numberOfLines={1} style={[t.caption, { color: c.txt3 }]}>{person.sport}</Text>
              </View>
              <Button label="Invite" icon="user-plus" enabled={busy !== person.id}
                busy={busy === person.id} busyLabel="Inviting…"
                accessibilityLabel={`Invite ${person.name}`}
                onPress={() => invite(person.id, person.name)} />
            </Row>
          ))}
        </View>
      </OverlayScaffold>
    </View>
  );
}
