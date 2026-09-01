import React, { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, Segmented, Toggle } from '../components/ui';
import { signOutUser } from '../lib/session';
import { calProviderLabel, CalProvider, Role } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// Mirrors the sample "Upcoming" list rendered by BookingsOverlay — the store has
// no bookings collection yet, so the badge count is pinned to that sample data.
const UPCOMING_SESSIONS = 2;

export function ProfileScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const role = s.role;
  const joinedCount = s.joinedCommunities.length;

  const stats: [string, string][] =
    role === 'COACH'
      ? [['640+', 'Sessions'], ['38', 'Clients'], ['★ 4.9', 'Rating']]
      : role === 'ADMIN'
      ? [['12.4k', 'Users'], ['312', 'Coaches'], ['3', 'Reports']]
      : [['48', 'Sessions'], ['7', 'Partners'], ['12', 'Day streak']];

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 26 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[t.pageTitle, { color: c.txt }]}>Profile</Text>
          {/* spec: "Alex Morgan - Beirut" under the title */}
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>
            {s.authName ?? 'Alex Morgan'} - Beirut
          </Text>
        </View>
        <Row gap={10}>
          <Pressable
            onPress={s.openNotifs}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="bell" size={20} color={c.txt2} />
            {!s.notifSeen && (
              <View style={{ position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: c.volt }} />
            )}
          </Pressable>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={20} color={c.accent} />
          </View>
        </Row>
      </Row>

      <Card style={{ marginTop: 18 }}>
        <Row style={{ padding: 15 }} gap={14}>
          <Avatar initials="AM" size={64} radius={17} fontSize={22} />
          <View style={{ flex: 1 }}>
            <Row gap={7}>
              <Text style={[t.overlayTitle, { color: c.txt }]}>Alex Morgan</Text>
              <Icon name="check-circle" size={17} color={c.accent} />
            </Row>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>
              {role === 'COACH' ? 'Strength coach · Iron Yard Gym, Hamra' : role === 'ADMIN' ? 'System administrator' : 'Training for first marathon 🏃'}
            </Text>
            <Row gap={7} style={{ marginTop: 8 }}>
              {role === 'ADMIN' ? (
                <MicroBadge label="Admin" bg={alpha(c.danger, 0.14)} fg={c.danger} />
              ) : role === 'COACH' ? (
                <MicroBadge label="Coach" bg={alpha(c.volt, 0.14)} fg={c.accent} />
              ) : (
                <MicroBadge label="User" bg={alpha(c.volt, 0.12)} fg={c.accent} />
              )}
              <MicroBadge label="Beirut" bg={c.surface2} fg={c.txt2} />
            </Row>
          </View>
        </Row>
      </Card>

      {/* stats */}
      <Row style={{ marginTop: 12 }} gap={10}>
        {stats.map(([num, label]) => (
          <Card key={label} style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={[t.price, { fontSize: 23, color: c.accent }]}>{num}</Text>
            <Text style={[t.caption, { color: c.txt2, marginTop: 2 }]}>{label}</Text>
          </Card>
        ))}
      </Row>

      {/* goals */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>My goals</SectionHeading>
      <Row gap={8}>
        <GoalChip label="Run a marathon" highlight />
        <GoalChip label="Build endurance" />
        <GoalChip label="Stay consistent" />
      </Row>

      {/* qualifications (user + coach) */}
      {role !== 'ADMIN' && (
        <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Qualifications</SectionHeading>
          <View style={{ gap: 10 }}>
            {s.myCerts.map((cert) => (
              <Card key={cert.id}>
                <Row style={{ padding: 13 }} gap={12}>
                  <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: alpha(c.volt, 0.1), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="award" size={19} color={c.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.labelSm, { color: c.txt }]}>{cert.name}</Text>
                    <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{cert.issuer} · {cert.year}</Text>
                  </View>
                  <MicroBadge label={cert.verified ? 'Verified' : 'Pending'} bg={cert.verified ? alpha(c.volt, 0.12) : alpha(c.amber, 0.16)} fg={cert.verified ? c.accent : c.amberText} />
                  <Pressable
                    onPress={() => s.removeCert(cert.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${cert.name}`}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{ marginLeft: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="x" size={11} color={c.txt2} />
                  </Pressable>
                </Row>
              </Card>
            ))}
          </View>
          <Row style={{ marginTop: 10 }} gap={10}>
            <AddCertBtn icon="camera" label="Scan with camera" onPress={() => s.addCert('Scanned certificate')} />
            <AddCertBtn icon="upload" label="Upload file" onPress={() => s.addCert('Uploaded certificate')} />
          </Row>
        </>
      )}

      {/* become a coach (user) */}
      {role === 'USER' && (
        <RoleCard title="Become a coach" body="List your services, get booked, and earn. Subscription unlocks scheduling, payments & a public coach profile." buttonLabel="Start coaching" onPress={() => s.set('role', 'COACH')} />
      )}

      {/* coach subscription + tools */}
      {role === 'COACH' && (
        <>
          <RoleCard title="Coach subscription" badge="Active" body="Scheduling, payments and your public coach profile are active." buttonLabel="Manage" onPress={() => s.set('overlay', 'coachPackages')} />
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Coach tools</SectionHeading>
          <Card>
            <View style={{ padding: 15, gap: 13 }}>
              <ToolRow count="2" title="Appointment requests" body="Approve bookings & change requests" onPress={() => s.set('overlay', 'coachRequests')} />
              <ToolRow title="My schedule" body="Edit weekly timetable" onPress={() => s.set('overlay', 'coachSchedule')} />
              <ToolRow title="Today's sessions" body="Day view - mark sessions done" onPress={() => s.set('overlay', 'coachDayView')} />
              <ToolRow title="Packages, pricing & promos" body="Set prices · create discounts" onPress={() => s.set('overlay', 'coachPackages')} />
            </View>
          </Card>
        </>
      )}

      {/* demo role pills — User | Coach | Admin */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Demo role</SectionHeading>
      <Segmented
        options={[
          { key: 'USER', label: 'User' },
          { key: 'COACH', label: 'Coach' },
          { key: 'ADMIN', label: 'Admin' },
        ]}
        selected={s.role}
        onSelect={(k) => s.set('role', k as Role)}
        fontSize={13}
        pad={8}
      />

      {/* ---------------------------- TRAINING ---------------------------- */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Training</SectionHeading>
      <Card style={{ paddingHorizontal: 15 }}>
        <GroupRow
          icon="clock"
          title="My bookings"
          body={`${UPCOMING_SESSIONS} upcoming sessions · packages and past ratings`}
          badge={String(UPCOMING_SESSIONS)}
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
          body="Platform updates and daily plan briefing"
          dot={!s.notifSeen}
          onPress={s.openNotifs}
        />
        <RowDivider />
        <GroupRow
          icon="smartphone"
          title="Push notifications"
          body="Session changes, messages and platform updates"
          value={s.pushOn}
          onToggle={(v) => s.set('pushOn', v)}
        />
        <RowDivider />
        <GroupRow
          icon="sunrise"
          title="Daily plan briefing"
          body="Morning summary of sessions and community events"
          value={s.dailyPlanOn}
          onToggle={(v) => s.set('dailyPlanOn', v)}
        />
        <RowDivider />
        <GroupRow
          icon="calendar"
          title="Calendar sync"
          body={`${calProviderLabel[s.calProvider]} · sessions auto pushed`}
          value={s.calSyncOn}
          onToggle={(v) => s.set('calSyncOn', v)}
        />
      </Card>
      {s.calSyncOn && (
        <>
          <View style={{ marginTop: 10 }}>
            <Segmented
              options={(['GOOGLE', 'APPLE', 'OUTLOOK'] as CalProvider[]).map((k) => ({ key: k, label: calProviderLabel[k] }))}
              selected={s.calProvider}
              onSelect={(k) => s.set('calProvider', k as CalProvider)}
              fontSize={13}
              pad={8}
            />
          </View>
          <Text style={[t.caption, { color: c.txt3, marginTop: 8 }]}>Confirmed sessions and changes are pushed automatically.</Text>
        </>
      )}

      {/* ---------------------------- SETTINGS ---------------------------- */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Settings</SectionHeading>
      <Card style={{ paddingHorizontal: 15 }}>
        <GroupRow
          icon="moon"
          title="Appearance"
          body={s.isDark ? 'Dark theme · the handoff default' : 'Light theme'}
          value={s.isDark}
          onToggle={(v) => s.set('isDark', v)}
        />
        <RowDivider />
        <GroupRow
          icon="shopping-bag"
          title="Shop"
          body="Partner sports and hobby stores"
          onPress={() => s.set('tab', 'shop')}
        />
      </Card>

      {/* admin console — admins only, sits inside SETTINGS per spec 6 */}
      {role === 'ADMIN' && (
        <>
          <Text style={[t.labelSm, { color: c.txt2, marginTop: 14, marginBottom: 8 }]}>Admin console</Text>
          <Card>
            <View style={{ padding: 15, gap: 13 }}>
              <ToolRow icon="credit-card" title="Accounting" body="Margins, expenses, profit shares" onPress={() => s.set('overlay', 'adminAccounting')} />
              <ToolRow icon="user-check" title="Approvals" body="Hobby requests, communities and shop partners" onPress={() => s.set('overlay', 'adminApprovals')} />
              <ToolRow icon="flag" title="Misconduct reports" body="Review evidence · ban or suspend" onPress={() => s.set('overlay', 'adminReports')} />
              <ToolRow icon="percent" title="Promotions & promo codes" body="Create discounts · generate codes" onPress={() => s.set('overlay', 'adminPromos')} />
              <ToolRow icon="tag" title="Loyalty offers" body="Edit rewards & point costs" onPress={() => s.set('overlay', 'adminLoyalty')} />
              <Row gap={8} style={{ marginTop: 2 }}>
                <MicroBadge label="Admins only" bg={alpha(c.volt, 0.12)} fg={c.accent} />
                <Text style={[t.caption, { color: c.txt3, flex: 1 }]}>3-admin approval is enforced for fee/share changes.</Text>
              </Row>
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
          <GroupRow
            icon="log-out"
            title="Sign out"
            body={`${s.authName ?? 'Signed in'} · ${s.authEmail}`}
            onPress={() => {
              void signOutUser().catch(() => {});
            }}
          />
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

function GoalChip({ label, highlight }: { label: string; highlight?: boolean }) {
  const { c, t } = useTheme();
  return (
    <View style={{ borderRadius: 999, backgroundColor: highlight ? alpha(c.volt, 0.1) : c.surface, borderColor: highlight ? alpha(c.volt, 0.25) : c.line, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 }}>
      <Text style={[t.labelSm, { color: highlight ? c.accent : c.strong }]}>{label}</Text>
    </View>
  );
}

function AddCertBtn({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderColor: c.line, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 13 }}
    >
      <Icon name={icon} size={17} color={c.accent} />
      <Text style={[t.labelSm, { color: c.strong }]}>{label}</Text>
    </Pressable>
  );
}

function RoleCard({ title, body, badge, buttonLabel, onPress }: { title: string; body: string; badge?: string; buttonLabel: string; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card style={{ marginTop: 22, padding: 18 }} background={alpha(c.volt, 0.08)} borderColor={alpha(c.volt, 0.25)}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[t.overlayTitle, { fontSize: 16, color: c.txt }]}>{title}</Text>
        {badge && <MicroBadge label={badge} bg={alpha(c.volt, 0.14)} fg={c.accent} />}
      </Row>
      <Text style={[t.bodySm, { color: c.txt2, marginTop: 7 }]}>{body}</Text>
      <Row style={{ marginTop: 14, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Row style={{ alignItems: 'flex-end' }}>
          <Text style={[t.price, { fontSize: 20, color: c.accent }]}>$19</Text>
          <Text style={[t.bodySm, { color: c.txt3 }]}>/month</Text>
        </Row>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${buttonLabel} — ${title}`}
          style={{ minHeight: 44, justifyContent: 'center', borderRadius: 999, backgroundColor: c.volt, paddingHorizontal: 20, paddingVertical: 11 }}
        >
          <Text style={[t.labelSm, { color: c.ink }]}>{buttonLabel}</Text>
        </Pressable>
      </Row>
    </Card>
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
