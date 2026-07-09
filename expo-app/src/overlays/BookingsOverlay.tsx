import React from 'react';
import { Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading } from '../components/ui';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

const PACKAGES = [
  { who: 'Marcus Reyes', initials: 'MR', pack: '5-session pack', used: 3, total: 5, expiry: 'Valid until Aug 29' },
  { who: 'Tariq Aziz', initials: 'TA', pack: 'Monthly plan', used: 5, total: 12, expiry: 'Renews Jul 28' },
];
const UPCOMING = [
  { who: 'Marcus Reyes', initials: 'MR', what: 'Strength session', when: 'Thu 09 · 6:30 PM', status: 'Confirmed' },
  { who: 'Lena Hoffmann', initials: 'LH', what: 'Mobility flow', when: 'Sat 11 · 8:00 AM', status: 'Pending' },
];
const PAST = [
  { who: 'Marcus Reyes', initials: 'MR', what: 'Heavy squats', when: 'Mon 06 · 6:30 PM' },
  { who: 'Diego Santos', initials: 'DS', what: 'Skill work', when: 'Fri 03 · 5:30 PM' },
];

export function BookingsOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="My bookings" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Packages</SectionHeading>
        <View style={{ gap: 10 }}>
          {PACKAGES.map((pk) => (
            <Card key={pk.who} style={{ padding: 14 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <Row gap={11}>
                  <Avatar initials={pk.initials} size={38} radius={11} fontSize={13} />
                  <View>
                    <Text style={[t.labelSm, { color: c.txt }]}>{pk.who} · {pk.pack}</Text>
                    <Text style={[t.caption, { color: c.txt2, marginTop: 1 }]}>{pk.used} of {pk.total} used · {pk.expiry}</Text>
                  </View>
                </Row>
                <Text style={[t.priceSm, { color: c.accent }]}>{pk.total - pk.used} left</Text>
              </Row>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: c.surface2, overflow: 'hidden' }}>
                <View style={{ width: `${(pk.used / pk.total) * 100}%`, height: 6, borderRadius: 999, backgroundColor: c.volt }} />
              </View>
            </Card>
          ))}
        </View>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Upcoming</SectionHeading>
        <View style={{ gap: 10 }}>
          {UPCOMING.map((u) => (
            <Card key={u.what} style={{ padding: 14 }}>
              <Row gap={11}>
                <Avatar initials={u.initials} size={40} radius={12} fontSize={14} />
                <View style={{ flex: 1 }}>
                  <Text style={[t.name, { color: c.txt }]}>{u.what}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{u.who} · {u.when}</Text>
                </View>
                <MicroBadge label={u.status} bg={u.status === 'Confirmed' ? alpha(c.volt, 0.14) : alpha(c.amber, 0.18)} fg={u.status === 'Confirmed' ? c.accent : c.amberText} />
              </Row>
              {s.calSyncOn && u.status === 'Confirmed' && (
                <Row gap={6} style={{ marginTop: 10 }}>
                  <Icon name="calendar" size={13} color={c.accent} />
                  <Text style={[t.caption, { color: c.accent }]}>In calendar ✓</Text>
                </Row>
              )}
            </Card>
          ))}
        </View>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Past</SectionHeading>
        <View style={{ gap: 10 }}>
          {PAST.map((pa) => (
            <Card key={pa.what} style={{ padding: 14 }}>
              <Row gap={11}>
                <Avatar initials={pa.initials} size={40} radius={12} fontSize={14} />
                <View style={{ flex: 1 }}>
                  <Text style={[t.name, { color: c.txt }]}>{pa.what}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{pa.who} · {pa.when}</Text>
                </View>
                <Row gap={4}>
                  <Icon name="star" size={16} color={c.amber} />
                  <Text style={[t.labelSm, { color: c.txt2 }]}>Rate</Text>
                </Row>
              </Row>
            </Card>
          ))}
        </View>
      </View>
    </OverlayScaffold>
  );
}
