import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, Stars, VoltButton } from '../components/ui';
import { coachPackageOptions, initials, personMeta } from '../state/models';
import { Certification, fetchCertifications } from '../lib/coaching';
import { blackoutLabel, DayGroup, fetchBlackouts, groupWeek, periodLabel } from '../lib/availability';
import { fetchCoachAvailability } from '../lib/queries';
import { startConversation } from '../lib/chat';
import { analyticsErrorCode, track } from '../lib/analytics';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function PersonOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [messaging, setMessaging] = useState(false);
  const p = s.personById(s.openId);

  // EVERY hook runs before the missing-person return below. Root replaces the
  // people list on refresh, so `p` can go from defined to undefined while this
  // overlay is open; a hook after the early return changes the hook count
  // between renders and React throws, dropping the whole app to the error
  // screen. BookingOverlay was fixed for exactly this and carries the same note.
  //
  // Credentials are extra detail, not the profile itself: a failed read leaves
  // the section absent rather than taking the whole profile down.
  const [certs, setCerts] = useState<Certification[]>([]);
  // `null` is "not set", which the booking RPC treats as open -- so an empty
  // array and a null week mean different things and must not be conflated.
  const [hours, setHours] = useState<DayGroup[] | null>(null);
  const [daysOff, setDaysOff] = useState<string[]>([]);
  const coachId = p?.isCoach ? p.id : null;
  useEffect(() => {
    if (!coachId) { setCerts([]); setHours(null); setDaysOff([]); return; }
    let active = true;
    fetchCertifications(coachId)
      .then((rows) => { if (active) setCerts(rows); })
      .catch(() => { if (active) setCerts([]); });
    // Three independent reads. A schedule that fails to load must not blank the
    // certificates, and neither must take the profile down -- the parts of a
    // profile are not each other's preconditions.
    fetchCoachAvailability(coachId)
      .then((week) => { if (active) setHours(week ? groupWeek(week) : null); })
      .catch(() => { if (active) setHours(null); });
    fetchBlackouts(coachId)
      .then((dates) => { if (active) setDaysOff(dates); })
      .catch(() => { if (active) setDaysOff([]); });
    return () => { active = false; };
  }, [coachId]);

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
  const following = s.followedIds.includes(p.id);
  const packageOptions = coachPackageOptions(p);
  const metrics = (p.isCoach
    ? [[Number(p.sessions) > 0 ? p.sessions : '', 'Sessions'], [p.reply === 'Not provided' ? '' : p.reply, 'Replies']]
    : [[p.level, 'Level']]
  ).filter(([value]) => value.trim());
  return (
    <OverlayScaffold
      header={<OverlayHeader title={p.isCoach ? 'Coach' : 'Training partner'} onBack={s.closeOverlay} trailing={
        <Row gap={14} style={{ alignItems: 'center' }}>
          {/* Blocking someone removes the follow server-side, so offering to
              follow them here would be offering something the database
              refuses. */}
          {!blocked && (
            <Pressable
              onPress={() => void s.toggleFollow(p.id)}
              accessibilityRole="button"
              accessibilityLabel={following ? `Stop following ${p.name}` : `Follow ${p.name}`}
              accessibilityState={{ selected: following, busy: s.writeBusy === 'follow' }}
            >
              <Icon name={following ? 'user-check' : 'user-plus'} size={22} color={following ? c.accent : c.txt2} />
            </Pressable>
          )}
          <Pressable
            onPress={messaging ? undefined : message}
            accessibilityRole="button"
            accessibilityLabel="Message this person"
            accessibilityState={{ busy: messaging }}
          >
            <Icon name="message-square" size={22} color={c.txt2} />
          </Pressable>
        </Row>
      } />}
      bottomBar={
        <View style={{ backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: 1, padding: 16 }}>
          {p.isCoach ? (
            <VoltButton label={`Book a session · $${p.price}`} onPress={s.openBooking} />
          ) : (
            <View style={{ gap: 10 }}>
              <VoltButton
                label="Ask to train together"
                onPress={() => s.set('overlay', 'partnerSession')}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Message ${p.name}`}
                accessibilityState={{ busy: messaging }}
                onPress={messaging ? undefined : message}
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={[t.label, { color: c.accent }]}>
                  {messaging ? 'Opening…' : 'Or send a message first'}
                </Text>
              </Pressable>
            </View>
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

        {/* Two lists, two headings. They used to be one, so a swimming coach
            who plays chess advertised chess coaching. The first pill is the
            subject they lead with, which is also what Discover filters on. */}
        {p.isCoach && (p.teaches?.length ?? 0) > 0 && (
          <TagRow heading="Teaches" tags={p.teaches ?? []} accent />
        )}
        {p.isCoach
          ? (p.plays?.length ?? 0) > 0 && <TagRow heading="Also plays" tags={p.plays ?? []} />
          : p.tags.length > 0 && <TagRow heading="Looking for" tags={p.tags} />}

        {p.isCoach && hours !== null && hours.length > 0 && <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>When they coach</SectionHeading>
          <Card style={{ padding: 14, gap: 10 }}>
            {hours.map((group) => (
              <Row key={group.days.join('-')} gap={12} style={{ alignItems: 'flex-start' }}>
                <Text style={[t.labelSm, { color: c.txt, width: 118 }]}>{dayRangeLabel(group.days)}</Text>
                <View style={{ flex: 1 }}>
                  {group.periods.map((period) => (
                    <Text key={`${period.startsAt}-${period.endsAt}`} style={[t.bodySm, { color: c.accent }]}>
                      {periodLabel(period)}
                    </Text>
                  ))}
                </View>
              </Row>
            ))}
            {/* The next few only. A coach with a month booked out would push
                everything below this off the screen. */}
            {daysOff.length > 0 && (
              <Text style={[t.caption, { color: c.txt3, marginTop: 2 }]}>
                Away {daysOff.slice(0, 3).map(blackoutLabel).join(', ')}
                {daysOff.length > 3 ? ` and ${daysOff.length - 3} more` : ''}
              </Text>
            )}
          </Card>
        </>}

        {p.isCoach && certs.length > 0 && <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Certificates</SectionHeading>
          <View style={{ gap: 10 }}>
            {certs.map((cert) => (
              <Card key={cert.id} style={{ padding: 0, overflow: 'hidden' }}>
                {cert.fileUrl && (
                  <Image source={{ uri: cert.fileUrl }} accessibilityIgnoresInvertColors
                    accessibilityLabel={`${cert.name} certificate`}
                    style={{ width: '100%', height: 150, backgroundColor: c.surface }} resizeMode="cover" />
                )}
                <Row gap={10} style={{ alignItems: 'center', padding: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.name, { color: c.txt }]}>{cert.name}</Text>
                    {(cert.issuer || cert.year) && (
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>
                        {[cert.issuer, cert.year].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                  {/* Only an admin-approved certificate is called verified. An
                      unreviewed one still shows -- hiding it would lose a real
                      credential -- but it says what it is. */}
                  <MicroBadge
                    label={cert.status === 'approved' ? 'Verified' : 'Not yet reviewed'}
                    bg={cert.status === 'approved' ? c.volt : c.surface2}
                    fg={cert.status === 'approved' ? c.ink : c.txt2}
                  />
                </Row>
              </Card>
            ))}
          </View>
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

// A heading and its pills.
//
// `accent` marks the list that is a claim rather than a fact about someone:
// what a coach teaches is what you would book them for, so it should not look
// the same as what they happen to play at weekends.
function TagRow({ heading, tags, accent = false }: { heading: string; tags: string[]; accent?: boolean }) {
  const { c, t } = useTheme();
  return (
    <>
      <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>{heading}</SectionHeading>
      <Row style={{ flexWrap: 'wrap' }} gap={8}>
        {tags.map((tag) => (
          <View key={tag} style={{ borderRadius: 999,
            backgroundColor: accent ? alpha(c.volt, 0.12) : c.surface,
            borderColor: accent ? alpha(c.volt, 0.45) : c.line,
            borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }}>
            <Text style={[t.labelSm, { color: accent ? c.accent : c.strong }]}>{tag}</Text>
          </View>
        ))}
      </Row>
    </>
  );
}

// "Mon – Fri", short because it sits in a fixed column beside the hours.
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayRangeLabel(days: number[]): string {
  if (days.length === 1) return SHORT_DAYS[days[0]];
  return `${SHORT_DAYS[days[0]]} – ${SHORT_DAYS[days[days.length - 1]]}`;
}
