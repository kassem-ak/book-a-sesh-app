import React from 'react';
import { Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Icon, Row } from '../components/ui';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function ConversationOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const chat = D.chatById(s.chatId);
  return (
    <OverlayScaffold
      header={<OverlayHeader title={chat.name} onBack={s.closeOverlay} />}
      bottomBar={
        <View style={{ backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: 1 }}>
          <Row style={{ padding: 12 }} gap={10}>
            <View style={{ flex: 1, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 }}>
              <Text style={[t.body, { color: c.txt3 }]}>Message {chat.name.split(' ')[0]}...</Text>
            </View>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="send" size={20} color={c.ink} />
            </View>
          </Row>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18, gap: 10 }}>
        {D.messages.map((m, i) => (
          <View key={i} style={{ alignItems: m.me ? 'flex-end' : 'flex-start' }}>
            <View style={{ maxWidth: '78%', borderRadius: 18, backgroundColor: m.me ? c.volt : c.surface, borderColor: m.me ? c.volt : c.line, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 }}>
              <Text style={[t.body, { color: m.me ? c.ink : c.soft }]}>{m.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </OverlayScaffold>
  );
}

export function NotificationsOverlay() {
  const { c } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="Notifications" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18, gap: 11 }}>
        {s.acctNotif && <NotifCard title={s.acctNotif.title} body={s.acctNotif.body} when={s.acctNotif.whenLabel} highlight />}
        <NotifCard title="Daily plan briefing" body="Strength session at 6:30 PM, plus two community events near you." when="Today" highlight={s.dailyPlanOn} />
        <NotifCard title="Booking confirmed" body="Marcus confirmed your 5-session pack for July." when="Yesterday" />
        <NotifCard title="New partner nearby" body="Jordan K. is looking for a tempo run partner within 400 m." when="2 days ago" />
      </View>
    </OverlayScaffold>
  );
}

function NotifCard({ title, body, when, highlight }: { title: string; body: string; when: string; highlight?: boolean }) {
  const { c, t } = useTheme();
  return (
    <Card background={highlight ? alpha(c.volt, 0.1) : c.surface} borderColor={highlight ? alpha(c.volt, 0.2) : c.line}>
      <Row style={{ padding: 14, alignItems: 'flex-start' }} gap={12}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: highlight ? alpha(c.volt, 0.14) : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={19} color={highlight ? c.accent : c.txt2} />
        </View>
        <View style={{ flex: 1 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={[t.name, { color: c.txt, flex: 1 }]}>{title}</Text>
            <Text style={[t.caption, { color: c.txt3 }]}>{when}</Text>
          </Row>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>{body}</Text>
        </View>
      </Row>
    </Card>
  );
}

export function ReportOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="Report" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 80 }}>
        <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={34} color={c.ink} />
        </View>
        <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>Report queued</Text>
        <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>A moderator will review this profile from the admin console.</Text>
      </View>
    </OverlayScaffold>
  );
}
