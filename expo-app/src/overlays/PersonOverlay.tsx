import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, Stars, StripedPlaceholder, VoltButton } from '../components/ui';
import { initials, personMeta } from '../state/models';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function PersonOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const p = s.personById(s.openId);
  return (
    <OverlayScaffold
      header={<OverlayHeader title={p.isCoach ? 'Coach' : 'Training partner'} onBack={s.closeOverlay} trailing={<Pressable onPress={() => s.openChat('m1')}><Icon name="message-square" size={22} color={c.txt2} /></Pressable>} />}
      bottomBar={
        <View style={{ backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: 1, padding: 16 }}>
          {p.isCoach ? (
            <VoltButton label={`Book a session · $${p.price}`} onPress={s.openBooking} />
          ) : (
            <VoltButton label="Message to train together" onPress={() => s.openChat('m1')} />
          )}
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <Row gap={14}>
          <Avatar initials={initials(p.name)} size={72} radius={20} fontSize={24} />
          <View style={{ flex: 1 }}>
            <Row gap={7}>
              <Text style={[t.overlayTitle, { color: c.txt }]}>{p.name}</Text>
              <Icon name="check-circle" size={16} color={c.accent} />
            </Row>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{personMeta(p)}</Text>
            <Row gap={5} style={{ marginTop: 5 }}>
              <Stars value={1} />
              <Text style={[t.labelSm, { color: c.txt }]}>{p.rating.toFixed(1)}</Text>
              <Text style={[t.caption, { color: c.txt3 }]}>({p.reviews} reviews)</Text>
            </Row>
          </View>
        </Row>

        <Row style={{ marginTop: 18 }} gap={10}>
          {[[p.sessions, 'Sessions'], [p.level, 'Level'], [p.reply, 'Replies']].map(([num, label]) => (
            <Card key={label} style={{ flex: 1, padding: 14, alignItems: 'center' }}>
              <Text style={[t.priceSm, { color: c.accent }]}>{num}</Text>
              <Text style={[t.caption, { color: c.txt2, marginTop: 2 }]}>{label}</Text>
            </Card>
          ))}
        </Row>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>About</SectionHeading>
        <Text style={[t.bodyLg, { color: c.soft, lineHeight: 22 }]}>{p.bio}</Text>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>{p.isCoach ? 'Specialties' : 'Looking for'}</SectionHeading>
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {p.tags.map((tag) => (
            <View key={tag} style={{ borderRadius: 999, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }}>
              <Text style={[t.labelSm, { color: c.strong }]}>{tag}</Text>
            </View>
          ))}
        </Row>

        {p.isCoach && (
          <>
            <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Packages</SectionHeading>
            <View style={{ gap: 10 }}>
              {[['Single session', `$${p.price}`, '60 min'], ['5-session pack', `$${(p.price ?? 0) * 5 - 20}`, 'Save $20'], ['Monthly plan', `$${(p.price ?? 0) * 10}`, '12 sessions']].map(([name, price, note]) => (
                <Card key={name} style={{ padding: 14 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View>
                      <Text style={[t.name, { color: c.txt }]}>{name}</Text>
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{note}</Text>
                    </View>
                    <Text style={[t.price, { color: c.accent }]}>{price}</Text>
                  </Row>
                </Card>
              ))}
            </View>
          </>
        )}

        {/* Board annotations on the coach profile: gallery images, an active
            hours setting page, and creating a new package. */}
        {p.isCoach && (
          <>
            <Row style={{ marginTop: 22, marginBottom: 11, justifyContent: 'space-between' }}>
              <SectionHeading>Gallery</SectionHeading>
              <Pressable onPress={() => s.set('overlay', 'coachPackages')}>
                <Text style={[t.label, { color: c.accent }]}>Add images</Text>
              </Pressable>
            </Row>
            <Row gap={10}>
              {['Session 1', 'Session 2', 'Session 3'].map((g) => (
                <View key={g} style={{ flex: 1 }}>
                  <StripedPlaceholder caption={g} height={86} />
                </View>
              ))}
            </Row>

            <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Active hours</SectionHeading>
            <Card>
              <Pressable onPress={() => s.set('overlay', 'coachSchedule')}>
                <Row style={{ padding: 15 }} gap={12}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="clock" size={19} color={c.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.name, { color: c.txt }]}>Weekly availability</Text>
                    <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>Set the hours clients can book</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={c.txt3} />
                </Row>
              </Pressable>
            </Card>

            <Pressable onPress={() => s.set('overlay', 'coachPackages')} style={{ marginTop: 12 }}>
              <Row
                style={{ borderRadius: 16, borderColor: c.line, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 15, justifyContent: 'center' }}
                gap={8}
              >
                <Icon name="plus" size={17} color={c.accent} />
                <Text style={[t.labelSm, { color: c.strong }]}>Create a new package</Text>
              </Row>
            </Pressable>
          </>
        )}

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Reviews</SectionHeading>
        <View style={{ gap: 10 }}>
          {D.personReviews.map((r, i) => (
            <Card key={i} style={{ padding: 14 }}>
              <Row gap={11}>
                <Avatar initials={r.initials} size={38} radius={11} fontSize={13} />
                <View style={{ flex: 1 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={[t.labelSm, { color: c.txt }]}>{r.name}</Text>
                    <Text style={[t.caption, { color: c.txt3 }]}>{r.whenLabel}</Text>
                  </Row>
                  <Stars value={r.stars} />
                </View>
              </Row>
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 8 }]}>{r.text}</Text>
            </Card>
          ))}
        </View>
      </View>
    </OverlayScaffold>
  );
}
