import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Icon, Row, VoltButton } from '../components/ui';
import {
  fetchCounterpart,
  fetchMessages,
  isPersistedId,
  markConversationRead,
  sendMessage,
  type ChatMessage,
} from '../lib/chat';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  REPORT_REASONS,
  submitReport,
  type AppNotification,
  type NotificationType,
} from '../lib/notifications';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

function message(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

// ---- shared inline states ---------------------------------------------------
// Overlays load over the network now, so each needs the same three placeholders.
// Kept local rather than added to components/ui.tsx: nothing else renders them.

function LoadingCard({ label }: { label: string }) {
  const { c, t } = useTheme();
  return (
    <Card>
      <Row style={{ padding: 18 }} gap={12}>
        <ActivityIndicator color={c.accent} />
        <Text style={[t.bodySm, { color: c.txt2 }]}>{label}</Text>
      </Row>
    </Card>
  );
}

function ErrorCard({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card>
      <View style={{ padding: 16 }}>
        <Row gap={10}>
          <Icon name="alert-circle" size={18} color={c.danger} />
          <Text style={[t.name, { color: c.txt, flex: 1 }]}>{title}</Text>
        </Row>
        <Text style={[t.bodySm, { color: c.txt2, marginTop: 6 }]}>{detail}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={`Retry: ${title}`}
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
        ) : null}
      </View>
    </Card>
  );
}

function EmptyCard({ icon, title, detail }: { icon: 'message-circle' | 'bell'; title: string; detail: string }) {
  const { c, t } = useTheme();
  return (
    <Card>
      <View style={{ padding: 18, alignItems: 'center' }}>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={c.txt2} />
        </View>
        <Text style={[t.name, { color: c.txt, marginTop: 12 }]}>{title}</Text>
        <Text style={[t.bodySm, { color: c.txt2, marginTop: 5, textAlign: 'center' }]}>{detail}</Text>
      </View>
    </Card>
  );
}

// ---- conversation -----------------------------------------------------------

export function ConversationOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const insets = useSafeAreaInsets();
  const conversationId = s.chatId;
  const live = isPersistedId(conversationId);

  const [title, setTitle] = React.useState('Conversation');
  const [messages, setMessages] = React.useState<ChatMessage[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [reloads, setReloads] = React.useState(0);

  React.useEffect(() => {
    if (!live) {
      setMessages([]);
      setError('This conversation is not available in chat.');
      return;
    }
    let alive = true;
    setError(null);
    (async () => {
      try {
        const [who, rows] = await Promise.all([
          fetchCounterpart(conversationId),
          fetchMessages(conversationId),
        ]);
        if (!alive) return;
        setTitle(who.name);
        setMessages(rows);
        // Opening the thread is what clears the badge; failing to record that
        // must not blank the thread the user came here to read.
        markConversationRead(conversationId).catch(() => undefined);
      } catch (e) {
        if (!alive) return;
        setMessages([]);
        setError(message(e, 'Could not load this conversation.'));
      }
    })();
    return () => {
      alive = false;
    };
  }, [conversationId, live, reloads]);

  // OverlayScaffold pins the composer to the bottom edge, which iOS keyboards
  // cover. Android's resize mode already lifts it, so only iOS needs the shift.
  const [keyboard, setKeyboard] = React.useState(0);
  React.useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const canSend = live && draft.trim().length > 0 && !sending;

  async function onSend() {
    if (!canSend) return;
    const body = draft.trim();
    setSending(true);
    try {
      const saved = await sendMessage(conversationId, body);
      setDraft('');
      setMessages((prev) => [...(prev ?? []), saved]);
    } catch (e) {
      s.set('writeError', message(e, 'Message could not be sent.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title={title} onBack={s.closeOverlay} />}
      bottomBar={
        <View
          style={{
            backgroundColor: c.bg,
            borderTopColor: c.line,
            borderTopWidth: 1,
            marginBottom: Math.max(keyboard - insets.bottom, 0),
          }}
        >
          <Row style={{ padding: 12 }} gap={10}>
            <View style={{ flex: 1, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                editable={live && !sending}
                placeholder={`Message ${title.split(' ')[0]}...`}
                placeholderTextColor={c.txt3}
                multiline
                accessibilityLabel={`Message ${title}`}
                onSubmitEditing={onSend}
                style={[t.body, { color: c.txt, padding: 0, maxHeight: 96, minHeight: 24 }]}
              />
            </View>
            <Pressable
              onPress={onSend}
              accessibilityRole="button"
              accessibilityLabel={sending ? 'Sending message' : 'Send message'}
              accessibilityState={{ disabled: !canSend, busy: sending }}
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: canSend ? c.volt : c.surface2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {sending ? (
                <ActivityIndicator color={c.txt2} />
              ) : (
                <Icon name="send" size={20} color={canSend ? c.ink : c.txt3} />
              )}
            </Pressable>
          </Row>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18, gap: 10 }}>
        {messages === null ? (
          <LoadingCard label="Loading messages…" />
        ) : error ? (
          <ErrorCard
            title="Couldn’t load this conversation"
            detail={error}
            onRetry={live ? () => { setMessages(null); setReloads((n) => n + 1); } : undefined}
          />
        ) : messages.length === 0 ? (
          <EmptyCard icon="message-circle" title="No messages yet" detail={`Say hello to ${title}.`} />
        ) : (
          messages.map((m) => (
            <View key={m.id} style={{ alignItems: m.mine ? 'flex-end' : 'flex-start' }}>
              <View style={{ maxWidth: '78%', borderRadius: 18, backgroundColor: m.mine ? c.volt : c.surface, borderColor: m.mine ? c.volt : c.line, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 }}>
                <Text style={[t.body, { color: m.mine ? c.ink : c.soft }]}>{m.body}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </OverlayScaffold>
  );
}

// ---- notifications ----------------------------------------------------------

// The notif_type enum is the only signal we have about what a row is about, so
// it picks the glyph instead of a per-row icon column.
const NOTIF_ICON: Record<NotificationType, 'bell' | 'calendar' | 'users' | 'info'> = {
  platform_update: 'info',
  daily_plan: 'bell',
  booking: 'calendar',
  partner_nearby: 'users',
  system: 'bell',
};

export function NotificationsOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [items, setItems] = React.useState<AppNotification[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloads, setReloads] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    setError(null);
    (async () => {
      try {
        const rows = await fetchNotifications();
        if (!alive) return;
        setItems(rows);
      } catch (e) {
        if (!alive) return;
        setItems([]);
        setError(message(e, 'Could not load your notifications.'));
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloads]);

  const unread = (items ?? []).filter((n) => !n.read).length;

  // Mark optimistically: the row is already on screen, and a failed UPDATE only
  // means the dot returns on the next load rather than losing anything.
  async function openOne(n: AppNotification) {
    if (n.read) return;
    setItems((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try {
      await markNotificationRead(n.id);
    } catch (e) {
      s.set('writeError', message(e, 'Could not mark that notification read.'));
    }
  }

  async function markAll() {
    setItems((prev) => (prev ?? []).map((x) => ({ ...x, read: true })));
    try {
      await markAllNotificationsRead();
    } catch (e) {
      s.set('writeError', message(e, 'Could not mark notifications read.'));
      setReloads((n) => n + 1);
    }
  }

  return (
    <OverlayScaffold
      header={
        <OverlayHeader
          title="Notifications"
          onBack={s.closeOverlay}
          subtitle={unread > 0 ? `${unread} unread` : undefined}
          trailing={
            unread > 0 ? (
              <Pressable
                onPress={markAll}
                accessibilityRole="button"
                accessibilityLabel={`Mark all ${unread} notifications as read`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1 }}
              >
                <Text style={[t.labelSm, { color: c.txt2 }]}>Mark all read</Text>
              </Pressable>
            ) : undefined
          }
        />
      }
    >
      <View style={{ paddingHorizontal: 18, gap: 11 }}>
        {items === null ? (
          <LoadingCard label="Loading notifications…" />
        ) : error ? (
          <ErrorCard
            title="Couldn’t load notifications"
            detail={error}
            onRetry={() => { setItems(null); setReloads((n) => n + 1); }}
          />
        ) : items.length === 0 ? (
          <EmptyCard icon="bell" title="You’re all caught up" detail="Booking updates and community news land here." />
        ) : (
          items.map((n) => <NotifCard key={n.id} notification={n} onPress={() => openOne(n)} />)
        )}
      </View>
    </OverlayScaffold>
  );
}

function NotifCard({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const { c, t } = useTheme();
  const { title, body, whenLabel, read, type } = notification;
  // Unread is the highlight now — it used to be a hardcoded `highlight` prop.
  const highlight = !read;
  return (
    // Card's own onPress renders an unlabelled Pressable, so the accessible
    // wrapper lives out here where the read/unread state can be announced.
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body ?? ''} ${whenLabel}. ${read ? 'Read' : 'Unread, tap to mark read'}`}
    >
      <Card
        background={highlight ? alpha(c.volt, 0.1) : c.surface}
        borderColor={highlight ? alpha(c.volt, 0.2) : c.line}
      >
        <Row style={{ padding: 14, alignItems: 'flex-start' }} gap={12}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: highlight ? alpha(c.volt, 0.14) : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={NOTIF_ICON[type] ?? 'bell'} size={19} color={highlight ? c.accent : c.txt2} />
          </View>
          <View style={{ flex: 1 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={[t.name, { color: c.txt, flex: 1 }]}>{title}</Text>
              <Text style={[t.caption, { color: c.txt3 }]}>{whenLabel}</Text>
            </Row>
            {body ? <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>{body}</Text> : null}
          </View>
        </Row>
      </Card>
    </Pressable>
  );
}

// ---- report -----------------------------------------------------------------

// Visually the shared `Chip`, but a report reason is a single-choice control:
// screen readers need the radio role and selected state, which `Chip` cannot
// express through its props.
function ReasonChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`Reason: ${label}`}
      accessibilityState={{ selected: active, checked: active }}
      style={{
        borderRadius: 999,
        backgroundColor: active ? c.volt : c.surface,
        borderColor: active ? c.volt : c.line,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}
    >
      <Text numberOfLines={1} style={[t.labelSm, { color: active ? c.ink : c.txt2 }]}>{label}</Text>
    </Pressable>
  );
}

export function ReportOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const subject = s.personById(s.openId);
  const [reason, setReason] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [filed, setFiled] = React.useState(false);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    try {
      await submitReport(subject.id, reason, summary);
      setFiled(true);
    } catch (e) {
      s.set('writeError', message(e, 'Report could not be filed.'));
    } finally {
      setBusy(false);
    }
  }

  // Only shown after the insert succeeded, so "open case" is a fact: reports
  // land with status 'open' and are what the admin console lists.
  if (filed) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Report" onBack={s.closeOverlay} />}>
        <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 80 }}>
          <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={34} color={c.ink} />
          </View>
          <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>Report filed</Text>
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>
            Your report about {subject.name} is now an open case for the moderation team. You will not be told the outcome.
          </Text>
        </View>
      </OverlayScaffold>
    );
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title="Report" onBack={s.closeOverlay} subtitle={subject.name} />}
    >
      <View style={{ paddingHorizontal: 18 }}>
        <Text style={[t.bodySm, { color: c.txt2, lineHeight: 20 }]}>
          Tell the moderation team what is wrong with this profile. Reports are reviewed by a
          person; nothing is sent to {subject.name}.
        </Text>

        <Text style={[t.labelSm, { color: c.txt, marginTop: 20, marginBottom: 10 }]}>Reason</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REPORT_REASONS.map((r) => (
            <ReasonChip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />
          ))}
        </View>

        <Text style={[t.labelSm, { color: c.txt, marginTop: 20, marginBottom: 10 }]}>
          What happened? (optional)
        </Text>
        <View style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="Add anything that helps a moderator decide."
            placeholderTextColor={c.txt3}
            multiline
            accessibilityLabel="Describe what happened"
            style={[t.body, { color: c.txt, padding: 0, minHeight: 96, textAlignVertical: 'top' }]}
          />
        </View>

        <View style={{ marginTop: 20 }}>
          <VoltButton
            label="Submit report"
            busyLabel="Filing report..."
            enabled={Boolean(reason)}
            busy={busy}
            onPress={submit}
          />
        </View>
      </View>
    </OverlayScaffold>
  );
}
