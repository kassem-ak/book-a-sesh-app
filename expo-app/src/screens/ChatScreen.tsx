import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Card, Icon, Row } from '../components/ui';
import { fetchConversations, type ConversationSummary } from '../lib/chat';
import { fetchNotifications, type AppNotification } from '../lib/notifications';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

export function ChatScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const overlay = useStore((st) => st.overlay);
  const [chats, setChats] = React.useState<ConversationSummary[] | null>(null);
  const [reminder, setReminder] = React.useState<AppNotification | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloads, setReloads] = React.useState(0);

  // Reloads whenever the last overlay closes: leaving a thread changes both its
  // unread badge and its preview line, and there is no push channel yet.
  React.useEffect(() => {
    if (overlay) return;
    let live = true;
    setError(null);
    (async () => {
      try {
        const [rows, notifs] = await Promise.all([fetchConversations(), fetchNotifications(20)]);
        if (!live) return;
        setChats(rows);
        setReminder(notifs.find((n) => n.type === 'booking') ?? null);
      } catch (e) {
        if (!live) return;
        setChats([]);
        setError(e instanceof Error ? e.message : 'Could not load your conversations.');
      }
    })();
    return () => {
      live = false;
    };
  }, [overlay, reloads]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 }}>
      <Text style={[t.pageTitle, { color: c.txt }]}>Chat</Text>
      <Text style={[t.bodySm, { color: c.txt2, marginTop: 14, marginBottom: 42 }]}>Conversations and session updates</Text>

      {chats === null ? (
        <Card>
          <Row style={{ padding: 18 }} gap={12}>
            <ActivityIndicator color={c.accent} />
            <Text style={[t.bodySm, { color: c.txt2 }]}>Loading conversations…</Text>
          </Row>
        </Card>
      ) : error ? (
        <Card>
          <View style={{ padding: 16 }}>
            <Row gap={10}>
              <Icon name="alert-circle" size={18} color={c.danger} />
              <Text style={[t.name, { color: c.txt, flex: 1 }]}>Couldn’t load conversations</Text>
            </Row>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 6 }]}>{error}</Text>
            <Pressable
              onPress={() => {
                setChats(null);
                setReloads((n) => n + 1);
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading conversations"
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
              <Text style={[t.labelSm, { color: c.txt }]}>Try again</Text>
            </Pressable>
          </View>
        </Card>
      ) : chats.length === 0 ? (
        <Card>
          <View style={{ padding: 18, alignItems: 'center' }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="message-circle" size={20} color={c.txt2} />
            </View>
            <Text style={[t.name, { color: c.txt, marginTop: 12 }]}>No conversations yet</Text>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 5, textAlign: 'center' }]}>
              Open a coach or training partner's profile and tap Message to start a conversation.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => s.set('tab', 'discover')} style={{ minHeight: 44, justifyContent: 'center', marginTop: 12 }}>
              <Text style={[t.labelSm, { color: c.accent }]}>Find people</Text>
            </Pressable>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 11 }}>
          {chats.map((chat) => (
            <Pressable
              key={chat.id}
              onPress={() => s.openChat(chat.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${chat.name}${chat.unread > 0 ? `, ${chat.unread} unread` : ''}`}
            >
              <Card>
                <Row style={{ padding: 14 }} gap={13}>
                  <Avatar initials={chat.initials} />
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
      )}

      {/* spec 5: "Session reminders" card with an "Open booking" action. The copy
          is the newest real booking notification, not a scripted line. */}
      <Card style={{ marginTop: 46 }} background={c.surface2}>
        <View style={{ padding: 18 }}>
          <Text style={[t.name, { color: c.txt, fontSize: 17, marginBottom: 10 }]}>Session reminders</Text>
          <Text style={[t.bodySm, { color: c.soft, lineHeight: 20 }]}>
            {reminder
              ? reminder.body ?? reminder.title
              : 'No session reminders right now. Confirmed bookings show up here.'}
          </Text>
          <Pressable
            onPress={s.openBookings}
            accessibilityRole="button"
            accessibilityLabel="Open booking"
            style={{
              marginTop: 12,
              minHeight: 44,
              alignSelf: 'flex-start',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 999,
              paddingHorizontal: 18,
              backgroundColor: c.volt,
              borderColor: c.line,
              borderWidth: 1,
            }}
          >
            <Text style={[t.labelSm, { color: c.ink }]}>Open booking</Text>
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}
