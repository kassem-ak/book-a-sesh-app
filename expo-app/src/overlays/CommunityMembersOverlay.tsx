import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { HoldableItem, SafeItemAction } from '../components/ItemMenu';
import { Avatar, Field, MicroBadge, Row, SectionHeading } from '../components/ui';
import {
  canModerate, CommunityDetail, fetchCommunity, fetchMembers, isAdmin, Member,
  removeMember, Role, setMemberRole,
} from '../lib/communities';
import { currentAppUserId } from '../lib/bookings';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, useStore } from '../state/store';
import { initials } from '../state/models';
import { alpha, spacing, useTheme } from '../theme';

// Who is in a community.
//
// A page of its own rather than a section on the community profile: a crew of
// forty is a list somebody scrolls and searches, not a block wedged between the
// gallery and the events.
//
// Members only. `member_read` refuses a non-member outright, so this does not
// re-implement the rule -- it reads, and an empty answer for somebody who is
// not in the community is the database's answer, not a second check here.

export function CommunityMembersOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const communityId = s.communityId;

  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!communityId) return;
    setError(null);
    try {
      const found = await fetchCommunity(communityId);
      setDetail(found);
      if (!found) { setMembers([]); return; }
      const [people, me] = await Promise.all([
        fetchMembers(found.id),
        currentAppUserId().catch(() => null),
      ]);
      setMembers(people);
      setMeId(me);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => { void load(); }, [load]);

  const act = async (userId: string, write: () => Promise<void>) => {
    setBusy(userId);
    setError(null);
    try {
      await write();
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally { setBusy(null); }
  };

  const back = () => s.set('overlay', 'communityProfile');

  if (!communityId) {
    return <MissingSubject title="Members" message="No community is open." onBack={s.closeOverlay} />;
  }
  if (!loading && !detail) {
    return <MissingSubject title="Members" message="This community is no longer listed." onBack={back} />;
  }

  // My own role comes from the list, not the store: the store collapses owner
  // and admin into one word, which is what hid the delete button on the
  // settings screen until it was found in the browser.
  const myRole: Role | null = members.find((member) => member.userId === meId)?.role ?? null;

  // An empty list for a signed-in person means the policy refused them, which
  // only happens when they are not in this community.
  if (!loading && members.length === 0) {
    return (
      <MissingSubject
        title={detail?.name ?? 'Members'}
        message="Only members can see who is in this community. Join it first."
        onBack={back}
      />
    );
  }

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? members.filter((member) => member.name.toLowerCase().includes(needle))
    : members;

  return (
    <OverlayScaffold
      header={<OverlayHeader
        title="Members"
        subtitle={detail?.name}
        onBack={back}
      />}
    >
      <View style={{ paddingHorizontal: spacing.screen, gap: 12, paddingBottom: 24 }}>
        {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
        {loading && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>
            Loading the members…
          </Text>
        )}

        {/* Worth having once a crew is more than a screenful, and harmless
            before that. */}
        {members.length > 8 && (
          <Field value={query} onChange={setQuery} placeholder="Search by name" icon="search"
            label="Search members" />
        )}

        {!loading && (
          <SectionHeading>
            {needle ? `${shown.length} of ${members.length}` : `${members.length} ${members.length === 1 ? 'member' : 'members'}`}
          </SectionHeading>
        )}

        {!loading && shown.length === 0 && (
          <Text style={[t.bodySm, { color: c.txt3 }]}>Nobody by that name.</Text>
        )}

        {shown.map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            mine={member.userId === meId}
            // Admins and moderators manage the room; everyone else sees the
            // same list with nothing to press.
            manages={canModerate(myRole)}
            admin={isAdmin(myRole)}
            busy={busy === member.userId}
            onOpen={() => s.openPerson(member.userId)}
            onRole={(next) => void act(member.userId, () =>
              setMemberRole(detail!.id, member.userId, next))}
            onRemove={() => void act(member.userId, () =>
              removeMember(detail!.id, member.userId))}
          />
        ))}
      </View>
    </OverlayScaffold>
  );
}

// One member, and what can be done to them.
//
// Only an admin sees the role entries -- a moderator polices the room, they do
// not decide who runs it. Removal is open to both. The owner's row offers
// neither, and the database enforces all of it regardless of what renders.
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
        body: 'They lose access to members-only events, posts and the community thread. '
          + 'If the community is closed they will have to ask to join again.',
        confirmLabel: 'Remove them',
      },
      onPress: onRemove,
    }]),
  ];

  const body = (
    <Row gap={10} style={{ alignItems: 'center', paddingVertical: 4 }}>
      <Avatar initials={initials(member.name)} avatarUrl={member.avatarUrl} size={40} fontSize={14} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[t.name, { color: c.txt }]}>{member.name}</Text>
      </View>
      {mine && <MicroBadge label="You" bg={c.surface2} fg={c.txt2} />}
      {member.role !== 'member' && (
        <MicroBadge label={ROLE_LABEL[member.role]} bg={alpha(c.volt, 0.14)} fg={c.accent} />
      )}
    </Row>
  );

  // Somebody with nothing to do to this row gets a plain press that opens the
  // profile, not a menu whose only entry is what pressing already does.
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
