import React, { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, Segmented, Toggle } from '../components/ui';
import { signOutUser } from '../lib/session';
import { calProviderLabel, CalProvider, Role } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function ProfileScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const role = s.role;

  const stats: [string, string][] =
    role === 'COACH'
      ? [['640+', 'Sessions'], ['38', 'Clients'], ['★ 4.9', 'Rating']]
      : role === 'ADMIN'
      ? [['12.4k', 'Users'], ['312', 'Coaches'], ['3', 'Reports']]
      : [['48', 'Sessions'], ['7', 'Partners'], ['12', 'Day streak']];

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 26 }}>
      <Text style={[t.bodySm, { color: c.txt3 }]}>Your training home</Text>
      <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Profile</Text>

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
                  <Pressable onPress={() => s.removeCert(cert.id)} style={{ marginLeft: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
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

      {/* my training */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Account</SectionHeading>
      {s.authEmail ? (
        <SettingsRow
          icon="log-out"
          title={s.authName ?? 'Signed in'}
          body={`${s.authEmail} · tap to sign out`}
          onPress={() => {
            void signOutUser().catch(() => {});
          }}
        />
      ) : (
        <SettingsRow
          icon="log-in"
          title="Sign in or create account"
          body="Guest mode now · an account saves your activity"
          onPress={() => s.set('overlay', 'auth')}
        />
      )}

      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>My training</SectionHeading>
      <SettingsRow icon="clock" title="Bookings" body="Packages, upcoming sessions and past ratings" onPress={s.openBookings} />
      <View style={{ height: 10 }} />
      <SettingsRow icon="bell" title="Notifications" body="Platform updates and daily plan briefing" onPress={s.openNotifs} />
      <View style={{ height: 10 }} />
      {/* Board annotation: "Add my Communities" */}
      <SettingsRow
        icon="users"
        title="My Communities"
        body="Crews you own, moderate or follow"
        onPress={() => s.set('tab', 'community')}
      />

      {/* prefs */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Notification preferences</SectionHeading>
      <ToggleCard title="Push notifications" body="Session changes, messages and platform updates" value={s.pushOn} onChange={(v) => s.set('pushOn', v)} />
      <View style={{ height: 10 }} />
      <ToggleCard title="Daily plan briefing" body="Morning summary of sessions and community events" value={s.dailyPlanOn} onChange={(v) => s.set('dailyPlanOn', v)} />
      <View style={{ height: 10 }} />
      <ToggleCard title="Calendar sync" body="Push confirmed sessions and changes to your calendar" value={s.calSyncOn} onChange={(v) => s.set('calSyncOn', v)} />
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

      {/* appearance */}
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Appearance</SectionHeading>
      <ToggleCard title="Dark theme" body="Match the handoff default dark athletic UI" value={s.isDark} onChange={(v) => s.set('isDark', v)} />

      {/* demo role */}
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

      {/* admin console */}
      {role === 'ADMIN' && (
        <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Admin console</SectionHeading>
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
    <Pressable onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderColor: c.line, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 13 }}>
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
        <Pressable onPress={onPress} style={{ borderRadius: 999, backgroundColor: c.volt, paddingHorizontal: 20, paddingVertical: 11 }}>
          <Text style={[t.labelSm, { color: c.ink }]}>{buttonLabel}</Text>
        </Pressable>
      </Row>
    </Card>
  );
}

function ToolRow({ count, icon, title, body, onPress }: { count?: string; icon?: any; title: string; body: string; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
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

function SettingsRow({ icon, title, body, onPress }: { icon: any; title: string; body: string; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card onPress={onPress}>
      <Row style={{ padding: 15 }} gap={12}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={c.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.name, { color: c.txt }]}>{title}</Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{body}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={c.txt3} />
      </Row>
    </Card>
  );
}

function ToggleCard({ title, body, value, onChange }: { title: string; body: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c, t } = useTheme();
  return (
    <Card>
      <Row style={{ padding: 15 }} gap={12}>
        <View style={{ flex: 1 }}>
          <Text style={[t.name, { color: c.txt }]}>{title}</Text>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{body}</Text>
        </View>
        <Toggle value={value} onChange={onChange} />
      </Row>
    </Card>
  );
}
