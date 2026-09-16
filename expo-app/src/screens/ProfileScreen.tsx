import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, Toggle } from '../components/ui';
import { fetchMyBookings } from '../lib/bookings';
import { deleteAccount, signOutUser } from '../lib/session';
import { analyticsErrorCode, track } from '../lib/analytics';
import { initials } from '../state/models';
import { errorMessage, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function ProfileScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const role = s.role;
  const joinedCount = s.joinedCommunities.length;
  // Identity is whatever the signed-in account says it is. A guest has no name,
  // so this screen stays neutral rather than borrowing a sample person's.
  const name = s.authName;
  // `null` means "not loaded / could not load" and renders no badge at all —
  // the same contract as joinedCount. A count is never invented.
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  // Deleting an account is irreversible, so it takes a second tap.
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Deletion is irreversible and is not atomic on the server, so a second run
  // must not start while the first is still in flight.
  const [deleting, setDeleting] = useState(false);

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
  }, [s.authEmail]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 26 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[t.pageTitle, { color: c.txt }]}>Profile</Text>
          {/* The board had "<name> - <city>" here, but no account or device city
              exists to fill the second half, so only the real name is shown. */}
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{name ?? 'Guest'}</Text>
        </View>
        <Row gap={10}>
          <Pressable
            onPress={s.openNotifs}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="bell" size={20} color={c.txt2} />
          </Pressable>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={20} color={c.accent} />
          </View>
        </Row>
      </Row>

      <Card style={{ marginTop: 18 }}>
        <Row style={{ padding: 15 }} gap={14}>
          {/* No name means a blank avatar — inventing initials would name a
              person who is not the one holding the phone. */}
          <Avatar initials={name ? initials(name) : ''} size={64} radius={17} fontSize={22} />
          <View style={{ flex: 1 }}>
            <Row gap={7}>
              <Text style={[t.overlayTitle, { color: c.txt }]}>{name ?? 'Welcome'}</Text>
            </Row>
            {s.authEmail && <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>{s.authEmail}</Text>}
            <Row gap={7} style={{ marginTop: 8 }}>
              {role === 'ADMIN' ? (
                <MicroBadge label="Admin" bg={alpha(c.danger, 0.14)} fg={c.danger} />
              ) : role === 'COACH' ? (
                <MicroBadge label="Coach" bg={alpha(c.volt, 0.14)} fg={c.accent} />
              ) : (
                <MicroBadge label={s.authEmail ? "User" : "Guest"} bg={alpha(c.volt, 0.12)} fg={c.accent} />
              )}
              {/* The city badge is gone with the header city: no real source. */}
            </Row>
          </View>
        </Row>
      </Card>

      {/* coach subscription + tools */}
      {role === 'COACH' && (
        <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Coach tools</SectionHeading>
          <Card>
            <View style={{ padding: 15, gap: 13 }}>
              <ToolRow title="Appointment requests" body="Review requests · record decisions" onPress={() => s.set('overlay', 'coachRequests')} />
              <ToolRow title="My schedule" body="Edit weekly timetable" onPress={() => s.set('overlay', 'coachSchedule')} />
              <ToolRow title="Today's sessions" body="Day view - mark sessions done" onPress={() => s.set('overlay', 'coachDayView')} />
              <ToolRow title="Packages, pricing & promos" body="Set prices · record codes, not yet redeemable" onPress={() => s.set('overlay', 'coachPackages')} />
            </View>
          </Card>
        </>
      )}

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
          icon="bell"
          title="Notifications"
          body="Booking updates"
          onPress={s.openNotifs}
        />
      </Card>

      {/* ---------------------------- SETTINGS ---------------------------- */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Settings</SectionHeading>
      <Card style={{ paddingHorizontal: 15 }}>
        <GroupRow
          icon="moon"
          title="Appearance"
          body={s.isDark ? 'Dark theme' : 'Light theme'}
          value={s.isDark}
          onToggle={(v) => s.set('isDark', v)}
        />
      </Card>

      {/* admin console — admins only, sits inside SETTINGS per spec 6 */}
      {role === 'ADMIN' && (
        <>
          <Text style={[t.labelSm, { color: c.txt2, marginTop: 14, marginBottom: 8 }]}>Admin console</Text>
          <Card>
            <View style={{ padding: 15, gap: 13 }}>
              <ToolRow icon="user-check" title="Approvals" body="Hobby requests, communities and venues" onPress={() => s.set('overlay', 'adminApprovals')} />
              <ToolRow icon="flag" title="Misconduct reports" body="Review evidence · record decisions only" onPress={() => s.set('overlay', 'adminReports')} />
              <ToolRow icon="percent" title="Promotions & promo codes" body="Record codes · not yet redeemable in the app" onPress={() => s.set('overlay', 'adminPromos')} />
              <ToolRow icon="tag" title="Loyalty offers" body="Edit rewards & point costs" onPress={() => s.set('overlay', 'adminLoyalty')} />
              {/* No Accounting row on purpose. The console exists but is a
                  simulation: "Propose changes" can never enable because the
                  profit-share rows it validates are always empty, and saved
                  expenses live only in memory, so they vanish on restart while
                  the UI promises they recur. Reaching a tool that quietly
                  discards an admin's work is worse than not offering it.
                  Restore this row once accounting writes to the server. */}
            </View>
          </Card>
        </>
      )}

      <Card style={{ marginTop: 10, paddingHorizontal: 15 }}>
        {/* My day view — coaches only */}
        {role === 'COACH' && (
          <>
            <GroupRow
              icon="sun"
              title="My day view"
              body="Sessions to run today · mark as done"
              onPress={() => s.set('overlay', 'coachDayView')}
            />
            <RowDivider />
          </>
        )}
        {s.authEmail ? (
          <>
            <GroupRow
              icon="log-out"
              title="Sign out"
              body={`${s.authName ?? 'Signed in'} · ${s.authEmail}`}
              onPress={() => {
                void signOutUser().catch((error) => {
                  track('write_failed', { error_code: analyticsErrorCode(error) });
                  s.set('writeError', errorMessage(error));
                });
              }}
            />
            {/* Required in-app by both stores wherever accounts can be created.
                Two taps: deletion cannot be undone. */}
            <GroupRow
              icon="trash-2"
              title={confirmDelete ? 'Tap again to delete permanently' : 'Delete account'}
              body={
                confirmDelete
                  ? 'Your profile and personal data are removed and you cannot sign in again.'
                  : 'Permanently removes your profile and personal data'
              }
              onPress={() => {
                if (!confirmDelete) { setConfirmDelete(true); return; }
                if (deleting) return;
                setDeleting(true);
                setConfirmDelete(false);
                void deleteAccount().finally(() => setDeleting(false)).catch((error) => {
                  track('write_failed', { error_code: analyticsErrorCode(error) });
                  s.set('writeError', errorMessage(error));
                });
              }}
            />
          </>
        ) : (
          <GroupRow
            icon="log-in"
            title="Sign in or create account"
            body="Guest mode now · an account saves your activity"
            onPress={() => s.set('overlay', 'auth')}
          />
        )}
      </Card>
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
