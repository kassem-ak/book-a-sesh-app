import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Button, Card, Icon, IconButton, MicroBadge, Row, SectionHeading, TAP_SLOP, Toggle } from '../components/ui';
import { fetchMyBookings } from '../lib/bookings';
import { signOutUser } from '../lib/session';
import { analyticsErrorCode, track } from '../lib/analytics';
import { initials } from '../state/models';
import { errorMessage, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function ProfileScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const role = s.role;
  // Coaching UI asks `isCoach`, never `role`: an admin who coaches is 'ADMIN'.
  const isCoach = s.isCoach;
  const joinedCount = s.joinedCommunities.length;
  // Identity is whatever the signed-in account says it is, never a sample
  // person's. An account that has not set a name yet renders neutrally.
  const name = s.authName;
  const area = s.authLoc.trim();
  // `null` means "not loaded / could not load" and renders no badge at all —
  // the same contract as joinedCount. A count is never invented.
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setUpcomingCount(null);
    fetchMyBookings()
      .then((mine) => {
        if (active) setUpcomingCount(mine.upcoming.length);
      })
      .catch(() => {
        if (active) setUpcomingCount(null);
      });
    return () => {
      active = false;
    };
    // Signing in or out changes whose bookings these are.
  }, [s.authUid]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 26 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[t.pageTitle, { color: c.txt }]}>Profile</Text>
          {/* The board's "<name> - <city>". The city half stayed empty while
              nothing could set it; Edit profile now can, and an account that
              has not set one still renders the name alone rather than a
              placeholder. */}
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>
            {name ?? 'Your account'}{area ? ` · ${area}` : ''}
          </Text>
        </View>
        {/* The bell used to sit beside a person glyph drawn in the same box,
            with the same border and the same size, that did nothing at all.
            Two identical tiles where one is a button is how a person learns
            not to trust either; the avatar card below already says whose
            profile this is. */}
        <IconButton icon="bell" onPress={s.openNotifs} accessibilityLabel="Notifications" />
      </Row>

      <Card style={{ marginTop: 18 }}>
        <Row style={{ padding: 15 }} gap={14}>
          {/* No name means a blank avatar — inventing initials would name a
              person who is not the one holding the phone. */}
          <Avatar initials={name ? initials(name) : ''} avatarUrl={s.authAvatarUrl} size={64} radius={17} fontSize={22} />
          <View style={{ flex: 1 }}>
            <Row gap={7}>
              <Text style={[t.overlayTitle, { color: c.txt }]}>{name ?? 'Welcome'}</Text>
            </Row>
            {s.authEmail && <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>{s.authEmail}</Text>}
            <Row gap={7} style={{ marginTop: 8 }}>
              {role === 'ADMIN' ? (
                <MicroBadge label="Admin" bg={alpha(c.danger, 0.14)} fg={c.danger} />
              ) : isCoach ? (
                <MicroBadge label="Coach" bg={alpha(c.volt, 0.14)} fg={c.accent} />
              ) : (
                <MicroBadge label="Member" bg={alpha(c.volt, 0.12)} fg={c.accent} />
              )}
              {/* The city badge is gone with the header city: no real source. */}
            </Row>
          </View>
        </Row>
      </Card>

      {/* Fifteen rows in a single column, all the same height and all with the
          same chevron, is a list you read rather than scan. Four questions
          instead: who am I, what am I doing, what do I run, and what do I own.
          Nothing new was added -- the same destinations, sorted by the
          question they answer. */}

      {/* ------------------------------- YOU ------------------------------ */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>You</SectionHeading>
      <Card style={{ paddingHorizontal: 15 }}>
        {s.authUid && <>
          <GroupRow icon="edit-2" title="Edit profile" body="Photo, name, bio and interests" onPress={() => s.set('overlay', 'editProfile')} />
          <RowDivider />
        </>}
        {/* Board annotation: "Add my Communities" */}
        <GroupRow
          icon="users"
          title="My communities"
          body="Crews you own, moderate or follow"
          badge={joinedCount > 0 ? String(joinedCount) : undefined}
          onPress={() => s.set('overlay', 'myCommunities')}
        />
        <RowDivider />
        <GroupRow
          icon="user-check"
          title="Your circle"
          body="Coaches and partners you follow"
          badge={s.followedIds.length > 0 ? String(s.followedIds.length) : undefined}
          onPress={() => s.set('overlay', 'circle')}
        />
      </Card>

      {/* ---------------------------- TRAINING ---------------------------- */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Training</SectionHeading>
      <Card style={{ paddingHorizontal: 15 }}>
        <GroupRow
          icon="clock"
          title="My bookings"
          body={
            upcomingCount === null
              ? 'Sessions and packages'
              : `${upcomingCount} upcoming ${upcomingCount === 1 ? 'session' : 'sessions'} · packages`
          }
          badge={upcomingCount ? String(upcomingCount) : undefined}
          onPress={s.openBookings}
        />
        <RowDivider />
        <GroupRow
          icon="bell"
          title="Notifications"
          body="Booking updates"
          onPress={s.openNotifs}
        />
      </Card>

      {/* coach tools — free for every coach */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Coaching</SectionHeading>
      {isCoach ? (
        <Card>
          <View style={{ padding: 15, gap: 13 }}>
            {/* Each row carries its own glyph. Without one ToolRow falls
                back to a chevron, so the list a working coach uses every day
                was five identical badges with a chevron at each end. */}
            <ToolRow icon="inbox" title="Appointment requests" body="Review requests · record decisions" onPress={() => s.set('overlay', 'coachRequests')} />
            <ToolRow icon="sun" title="Today's sessions" body="Day view · mark sessions done" onPress={() => s.set('overlay', 'coachDayView')} />
            {/* One row per decision, like the rows either side of them. These
                were three sections of a single "Coaching settings" page --
                what you teach, when you work and what you charge are made at
                three different times and belong apart. */}
            <ToolRow icon="book-open" title="What you teach" body="Your subjects and experience" onPress={() => s.set('overlay', 'coachSubjects')} />
            <ToolRow icon="calendar" title="When you coach" body="Working hours · days off" onPress={() => s.set('overlay', 'coachHours')} />
            <ToolRow icon="tag" title="Packages, pricing & promos" body="Set prices · answer cancellations" onPress={() => s.set('overlay', 'coachPackages')} />
          </View>
        </Card>
      ) : (
        // The way in sits where the tools will be, so somebody who takes it up
        // finds them in the place they already looked once.
        <Card style={{ paddingHorizontal: 15 }}>
          <GroupRow
            icon="award"
            title="Become a coach"
            body="Free. Adds a coach profile so people can book you"
            onPress={() => s.set('overlay', 'coaching')}
          />
        </Card>
      )}

      {/* ---------------------------- ACCOUNT ----------------------------- */}
      {/* The admin console moved to the web back office. Administration is
          not a phone job: it needs the service role, which must never ship in
          a client, and every tool that used to sit here now has a server-side
          actor check rather than a UI-only gate. Nothing privileged is
          reachable from this build. */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Account</SectionHeading>
      <Card style={{ paddingHorizontal: 15 }}>
        <GroupRow
          icon="moon"
          title="Appearance"
          body={s.isDark ? 'Dark theme' : 'Light theme'}
          value={s.isDark}
          onToggle={(v) => s.set('isDark', v)}
        />
      </Card>

      {/* Sign out was a row in an unlabelled card, the same height and the
          same chevron as the rows that merely navigate -- so the one control
          that ends the session looked exactly like the one that opens a list.
          It is a button now, on its own at the end of the screen, after
          everything it signs you out of. */}
      <View style={{ marginTop: 34, gap: 10 }}>
        <Text style={[t.bodySm, { color: c.txt3 }]}>
          {/* authEmail is nullable, and template-stringing it printed the
              literal word "null" for any account without one. */}
          {[s.authName, s.authEmail].filter(Boolean).join(' · ') || 'Signed in'}
        </Text>
        <Button
          label="Sign out"
          icon="log-out"
          full
          onPress={() => {
            void signOutUser().catch((error) => {
              track('write_failed', { error_code: analyticsErrorCode(error) });
              s.set('writeError', errorMessage(error));
            });
          }}
        />
      </View>
    </ScrollView>
  );
}

function ToolRow({ count, icon, title, body, onPress }: { count?: string; icon?: any; title: string; body: string; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count ? `${title}, ${count}` : title}
      accessibilityHint={body}
      // The tools sit in a gapped column, so unlike the divided GroupRows
      // nothing pads these out past their 44pt content.
      hitSlop={TAP_SLOP}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}
    >
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: count ? alpha(c.volt, 0.12) : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        {count ? <Text style={[t.priceSm, { color: c.accent }]}>{count}</Text> : <Icon name={icon ?? 'chevron-right'} size={18} color={c.accent} />}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[t.name, { color: c.txt }]}>{title}</Text>
        <Text style={[t.bodySm, { color: c.txt2 }]}>{body}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={c.txt3} />
    </Pressable>
  );
}

function RowDivider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line2 }} />;
}

/**
 * One row inside a labelled TRAINING / SETTINGS group. Either a navigation row
 * (chevron + optional badge/dot) or a switch row — in the switch case the whole
 * row is the switch so the tap target clears 44px and carries the label, since
 * the shared `Toggle` has no accessibilityLabel of its own.
 */
function GroupRow({
  icon,
  title,
  body,
  badge,
  dot,
  value,
  onToggle,
  onPress,
}: {
  icon: any;
  title: string;
  body: string;
  badge?: string;
  dot?: boolean;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
}) {
  const { c, t } = useTheme();
  const isSwitch = typeof onToggle === 'function';
  const content = (
    <Row style={{ paddingVertical: 13, minHeight: 44 }} gap={12}>
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={c.accent} />
        {dot && (
          <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: c.volt }} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.name, { color: c.txt }]}>{title}</Text>
        <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{body}</Text>
      </View>
      {badge ? <MicroBadge label={badge} bg={c.surface2} fg={c.accent} /> : null}
      {isSwitch ? (
        <View pointerEvents="none">
          <Toggle value={!!value} onChange={() => {}} />
        </View>
      ) : (
        <Icon name="chevron-right" size={20} color={c.txt3} />
      )}
    </Row>
  );

  if (isSwitch)
    return (
      <Pressable
        onPress={() => onToggle!(!value)}
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityHint={body}
        accessibilityState={{ checked: !!value }}
      >
        {content}
      </Pressable>
    );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${title}, ${badge}` : title}
      accessibilityHint={body}
    >
      {content}
    </Pressable>
  );
}
