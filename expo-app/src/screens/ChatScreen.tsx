import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Card, Row, SectionHeading } from '../components/ui';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

export function ChatScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 }}>
      <Text style={[t.bodySm, { color: c.txt3 }]}>Messages from coaches and partners</Text>
      <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Chat</Text>

      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Conversations</SectionHeading>
      <View style={{ gap: 11 }}>
        {D.chats.map((chat) => (
          <Pressable
            key={chat.id}
            onPress={() => s.openChat(chat.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open conversation with ${chat.name}${chat.unread > 0 ? `, ${chat.unread} unread` : ''}`}
          >
            <Card>
              <Row style={{ padding: 14 }} gap={13}>
                <View>
                  <Avatar initials={chat.initials} />
                  {chat.online && (
                    <View style={{ position: 'absolute', bottom: 0, left: 40, width: 12, height: 12, borderRadius: 6, backgroundColor: c.volt, borderColor: c.surface, borderWidth: 2 }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={[t.name, { color: c.txt }]}>{chat.name}</Text>
                    <Text style={[t.caption, { color: c.txt3 }]}>{chat.whenLabel}</Text>
                  </Row>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]} numberOfLines={1}>{chat.last}</Text>
                </View>
                {chat.unread > 0 && (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[t.labelSm, { color: c.ink }]}>{chat.unread}</Text>
                  </View>
                )}
              </Row>
            </Card>
          </Pressable>
        ))}
      </View>

      {/* spec 5: "Session reminders" card with an "Open booking" action */}
      <Card style={{ marginTop: 20 }}>
        <View style={{ padding: 15 }}>
          <SectionHeading style={{ marginBottom: 10 }}>Session reminders</SectionHeading>
          <Text style={[t.bodySm, { color: c.soft, lineHeight: 20 }]}>
            Marcus approved your Thursday 6:30 PM strength session.
          </Text>
          <Pressable
            onPress={s.openBookings}
            accessibilityRole="button"
            accessibilityLabel="Open booking"
            style={{
              marginTop: 12,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: c.surface2,
              borderColor: c.line,
              borderWidth: 1,
            }}
          >
            <Text style={[t.labelSm, { color: c.txt }]}>Open booking</Text>
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}
