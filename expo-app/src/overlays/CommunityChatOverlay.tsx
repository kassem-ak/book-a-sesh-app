import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MissingSubject, OverlayHeader } from '../components/Overlay';
import { ConfirmIconButton } from '../components/ItemMenu';
import { Avatar, Icon, MicroBadge, Row } from '../components/ui';
import {
  canModerate, canPost, ChatMode, CommunityDetail, CommunityMessage,
  deleteCommunityMessage, fetchCommunity, fetchCommunityMessages, postCommunityMessage, Role,
} from '../lib/communities';
import { currentAppUserId } from '../lib/bookings';
import { fetchMembers } from '../lib/communities';
import { analyticsErrorCode, track } from '../lib/analytics';
import { errorMessage, isExplicit, useStore } from '../state/store';
import { initials } from '../state/models';
import { alpha, radii, spacing, useTheme } from '../theme';

// The community's thread.
//
// One screen for both modes. A chatroom and a newsletter differ in exactly one
// thing -- whether an ordinary member may post -- so they are not two screens;
// the composer is either there or replaced by a line saying who may write.

export function CommunityChatOverlay() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStore();
  const communityId = s.communityId;

  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollView | null>(null);

  const load = useCallback(async () => {
    if (!communityId) return;
    setError(null);
    try {
      const found = await fetchCommunity(communityId);
      setDetail(found);
      if (!found) { setMessages([]); return; }
      // The mode says who may post; the member list says which of those I am.
      const [thread, me, people] = await Promise.all([
        fetchCommunityMessages(found.id),
        currentAppUserId().catch(() => null),
        fetchMembers(found.id).catch(() => []),
      ]);
      setMessages(thread);
      setRole(people.find((member) => member.userId === me)?.role ?? null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => { void load(); }, [load]);

  const send = () => void (async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await postCommunityMessage(detail!.id, body);
      // Cleared only once it is actually sent: losing what somebody typed
      // because the network dropped is worse than leaving it in the box.
      setDraft('');
      await load();
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally { setSending(false); }
  })();

  if (!communityId) {
    return <MissingSubject title="Community" message="No community is open." onBack={s.closeOverlay} />;
  }
  if (!loading && !detail) {
    return <MissingSubject title="Community" message="This community is no longer listed." onBack={s.closeOverlay} />;
  }
  if (!loading && !role) {
    return (
      <MissingSubject
        title={detail?.name ?? 'Community'}
        message="Only members can read this community's thread. Join it first."
        onBack={s.closeOverlay}
      />
    );
  }

  const mode: ChatMode = detail?.chatMode ?? 'chatroom';
  const mayPost = canPost(mode, role);
  const blocked = isExplicit(draft);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <OverlayHeader
          title={detail?.name ?? 'Community'}
          subtitle={mode === 'newsletter' ? 'Announcements' : 'Everyone can post'}
          onBack={s.closeOverlay}
        />
      </View>

      <ScrollView
        ref={scroller}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{ padding: spacing.screen, gap: 12, paddingBottom: 24 }}
      >
        {loading && (
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>
            Loading the thread…
          </Text>
        )}
        {!loading && messages.length === 0 && (
          <Text style={[t.bodySm, { color: c.txt3 }]}>
            {mode === 'newsletter'
              ? 'No announcements yet.'
              : 'Nothing here yet. Say the first thing.'}
          </Text>
        )}

        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            // A moderator can clear up somebody else's; anyone can remove
            // their own. The database enforces both regardless.
            canRemove={message.mine || canModerate(role)}
            onRemove={() => void (async () => {
              setError(null);
              try {
                await deleteCommunityMessage(message.id);
                await load();
              } catch (e) { setError(errorMessage(e)); }
            })()}
          />
        ))}
      </ScrollView>

      {error && (
        <Text accessibilityRole="alert"
          style={[t.bodySm, { color: c.danger, paddingHorizontal: spacing.screen, paddingBottom: 8 }]}>
          {error}
        </Text>
      )}

      <View style={{
        borderTopColor: c.line, borderTopWidth: 1, backgroundColor: c.bg,
        padding: 12, paddingBottom: 12 + insets.bottom,
      }}>
        {mayPost ? (
          <Row gap={10} style={{ alignItems: 'flex-end' }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              editable={!sending}
              maxLength={2000}
              placeholder={mode === 'newsletter' ? 'Write an announcement' : 'Say something'}
              placeholderTextColor={c.txt3}
              accessibilityLabel={mode === 'newsletter' ? 'Write an announcement' : 'Write a message'}
              style={[t.body, {
                flex: 1, color: c.txt, backgroundColor: c.surface,
                borderColor: c.line, borderWidth: 1, borderRadius: radii.input,
                paddingHorizontal: 14, paddingVertical: 10, minHeight: 48, maxHeight: 120,
              }]}
            />
            <Pressable
              onPress={send}
              disabled={!draft.trim() || sending || blocked}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !draft.trim() || sending || blocked }}
              style={{
                width: 48, height: 48, borderRadius: 24,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: draft.trim() && !blocked ? c.volt : c.surface2,
              }}
            >
              <Icon name="send" size={18} color={draft.trim() && !blocked ? c.ink : c.txt3} />
            </Pressable>
          </Row>
        ) : (
          // Not an error, and not a disabled box. A member of an
          // announcements-only community is not failing at anything.
          <Row gap={8} style={{ alignItems: 'center' }}>
            <Icon name="volume-2" size={16} color={c.txt3} />
            <Text style={[t.bodySm, { color: c.txt2, flex: 1 }]}>
              Announcements only. Admins and moderators post here.
            </Text>
          </Row>
        )}
        {blocked && (
          <Text accessibilityRole="alert" style={[t.caption, { color: c.danger, marginTop: 8 }]}>
            Contains blocked content. Edit it to send; nothing has been posted.
          </Text>
        )}
      </View>
    </View>
  );
}

function Message({ message, canRemove, onRemove }: {
  message: CommunityMessage;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Row gap={10} style={{ alignItems: 'flex-start' }}>
      <Avatar initials={initials(message.authorName)} avatarUrl={message.authorAvatar}
        size={34} fontSize={12} />
      <View style={{
        flex: 1, minWidth: 0, backgroundColor: message.mine ? alpha(c.volt, 0.1) : c.surface,
        borderRadius: radii.input, borderColor: c.line, borderWidth: 1, padding: 12,
      }}>
        <Row gap={8} style={{ alignItems: 'center' }}>
          <Text numberOfLines={1} style={[t.labelSm, { color: c.txt, flex: 1 }]}>
            {message.authorName}
          </Text>
          {message.mine && <MicroBadge label="You" bg={c.surface2} fg={c.txt2} />}
          <Text style={[t.caption, { color: c.txt3 }]}>{shortTime(message.createdAt)}</Text>
          {canRemove && (
            <ConfirmIconButton
              icon="trash-2"
              size={14}
              accessibilityLabel={`Remove the message from ${message.authorName}`}
              confirm={{
                title: 'Remove this message?',
                body: message.mine
                  ? 'It disappears for everyone in the community.'
                  : 'It disappears for everyone. The person who wrote it is not told.',
                confirmLabel: 'Remove it',
              }}
              onPress={onRemove}
            />
          )}
        </Row>
        <Text style={[t.body, { color: c.soft, marginTop: 4 }]}>{message.body}</Text>
      </View>
    </Row>
  );
}

/** "14:32" today, "4 Oct" before that. A thread is read for what was said and
 *  roughly when, not to the second. */
function shortTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const sameDay = new Date().toDateString() === at.toDateString();
  return sameDay
    ? at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
