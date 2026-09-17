import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, Icon, Row, SectionHeading, Stars, VoltButton } from '../components/ui';
import { coachPackageOptions, initials, personMeta } from '../state/models';
import { startConversation } from '../lib/chat';
import { analyticsErrorCode, track } from '../lib/analytics';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

export function PersonOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [messaging, setMessaging] = useState(false);
  const p = s.personById(s.openId);
  if (!p) return <MissingSubject title="Profile" message="This profile is no longer available." onBack={s.closeOverlay} />;

  // start_conversation reuses an existing thread, so tapping twice is safe.
  const message = async () => {
    setMessaging(true);
    try {
      s.openChat(await startConversation(p.id));
      track('conversation_started_from_profile');
    } catch (error) {
      track('write_failed', { error_code: analyticsErrorCode(error) });
      s.set('writeError', error instanceof Error ? error.message : 'Could not open that conversation.');
    } finally {
      setMessaging(false);
    }
  };
  const blocked = s.blockedIds.includes(p.id);
  const packageOptions = coachPackageOptions(p);
  const metrics = (p.isCoach
    ? [[Number(p.sessions) > 0 ? p.sessions : '', 'Sessions'], [p.reply === 'Not provided' ? '' : p.reply, 'Replies']]
    : [[p.level, 'Level']]
  ).filter(([value]) => value.trim());
  return (
    <OverlayScaffold
      header={<OverlayHeader title={p.isCoach ? 'Coach' : 'Training partner'} onBack={s.closeOverlay} trailing={
        <Pressable
          onPress={messaging ? undefined : message}
          accessibilityRole="button"
          accessibilityLabel="Message this person"
          accessibilityState={{ busy: messaging }}
        >
          <Icon name="message-square" size={22} color={c.txt2} />
        </Pressable>
      } />}
      bottomBar={
        <View style={{ backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: 1, padding: 16 }}>
          {p.isCoach ? (
            <VoltButton label={`Book a session · $${p.price}`} onPress={s.openBooking} />
          ) : (
            <VoltButton
              label="Message to train together"
              busy={messaging}
              busyLabel="Opening..."
              onPress={message}
            />
          )}
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <Row gap={14}>
          <Avatar initials={initials(p.name)} avatarUrl={p.avatarUrl} size={72} radius={20} fontSize={24} />
          <View style={{ flex: 1 }}>
            <Text style={[t.overlayTitle, { color: c.txt }]}>{p.name}</Text>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{personMeta(p)}</Text>
            {p.isCoach && p.reviews > 0 && <Row gap={5} style={{ marginTop: 5 }}>
              <Stars value={1} />
              <Text style={[t.labelSm, { color: c.txt }]}>{p.rating.toFixed(1)}</Text>
              <Text style={[t.caption, { color: c.txt3 }]}>({p.reviews} reviews)</Text>
            </Row>}
          </View>
        </Row>

        {metrics.length > 0 && <Row style={{ marginTop: 18 }} gap={10}>
          {metrics.map(([value, label]) => (
            <Card key={label} style={{ flex: 1, padding: 14, alignItems: 'center' }}>
              <Text style={[t.priceSm, { color: c.accent }]}>{value}</Text>
              <Text style={[t.caption, { color: c.txt2, marginTop: 2 }]}>{label}</Text>
            </Card>
          ))}
        </Row>}

        {p.bio.trim().length > 0 && <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>About</SectionHeading>
          <Text style={[t.bodyLg, { color: c.soft, lineHeight: 22 }]}>{p.bio}</Text>
        </>}

        {p.tags.length > 0 && <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>{p.isCoach ? 'Specialties' : 'Looking for'}</SectionHeading>
          <Row style={{ flexWrap: 'wrap' }} gap={8}>
            {p.tags.map((tag) => (
              <View key={tag} style={{ borderRadius: 999, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }}>
                <Text style={[t.labelSm, { color: c.strong }]}>{tag}</Text>
              </View>
            ))}
          </Row>
        </>}

        {p.isCoach && (
          <>
            <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Packages</SectionHeading>
            <View style={{ gap: 10 }}>
              {packageOptions.map((pkg) => (
                <Card key={pkg.packageId ?? pkg.name} style={{ padding: 14 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View>
                      <Text style={[t.name, { color: c.txt }]}>{pkg.name}</Text>
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{pkg.note}</Text>
                    </View>
                    <Text style={[t.price, { color: c.accent }]}>${pkg.price}</Text>
                  </Row>
                </Card>
              ))}
            </View>
          </>
        )}

        {/* Safety.
            Both stores require an app carrying user-generated content to offer
            a way to report and a way to block. Reporting already existed but
            nothing opened it, so neither was reachable before this. */}
        <SectionHeading style={{ marginTop: 26, marginBottom: 11 }}>Safety</SectionHeading>
        <Row gap={10}>
          <Pressable
            onPress={() => s.set('overlay', 'report')}
            accessibilityRole="button"
            accessibilityLabel={`Report ${p.name}`}
            style={{ flex: 1, minHeight: 46, borderRadius: 14, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={[t.labelSm, { color: c.txt2 }]}>Report</Text>
          </Pressable>
          <Pressable
            onPress={() => void s.toggleBlock(p.id)}
            disabled={s.writeBusy === 'block'}
            accessibilityRole="button"
            accessibilityLabel={`${blocked ? 'Unblock' : 'Block'} ${p.name}`}
            accessibilityState={{ disabled: s.writeBusy === 'block' }}
            style={{ flex: 1, minHeight: 46, borderRadius: 14, borderColor: blocked ? c.line : c.danger, borderWidth: 1, alignItems: 'center', justifyContent: 'center', opacity: s.writeBusy === 'block' ? 0.5 : 1 }}
          >
            <Text style={[t.labelSm, { color: blocked ? c.txt2 : c.danger }]}>
              {s.writeBusy === 'block' ? 'Saving...' : blocked ? 'Unblock' : 'Block'}
            </Text>
          </Pressable>
        </Row>
        {blocked && (
          <Text style={[t.caption, { color: c.txt3, marginTop: 8 }]}>
            Blocked. Neither of you can message the other, and they are not told.
          </Text>
        )}

      </View>
    </OverlayScaffold>
  );
}
