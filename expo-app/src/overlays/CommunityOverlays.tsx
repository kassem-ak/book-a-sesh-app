import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, Chip, Field, Icon, MicroBadge, Row, SectionHeading, Segmented, StripedPlaceholder, VoltButton } from '../components/ui';
import { isMeetup } from '../state/models';
import * as D from '../state/sampleData';
import { isExplicit, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function CommunityDetailOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const cm = D.communityById(s.communityId);
  const subs = D.subGroups[cm.id] ?? [];
  const evs = s.allEvents().filter((e) => e.communityId === cm.id);
  return (
    <OverlayScaffold header={<OverlayHeader title="Community" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <Card style={{ padding: 15 }}>
          <Row gap={14}>
            <Avatar initials={cm.code} size={64} radius={17} bg={cm.tint} />
            <View style={{ flex: 1 }}>
              <Row gap={8}>
                <Text style={[t.overlayTitle, { color: c.txt }]}>{cm.sport}</Text>
                {cm.official && <MicroBadge label="Official" bg={alpha(c.volt, 0.14)} fg={c.accent} />}
              </Row>
              <Text style={[t.caption, { color: c.txt3, marginTop: 3 }]}>{cm.members} members</Text>
            </View>
          </Row>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 12 }]}>{cm.about}</Text>
        </Card>

        <Row style={{ marginTop: 22, marginBottom: 11, justifyContent: 'space-between' }}>
          <SectionHeading>Events</SectionHeading>
          <Pressable onPress={s.openCreateEvent}><Text style={[t.label, { color: c.accent }]}>+ Create</Text></Pressable>
        </Row>
        <View style={{ gap: 10 }}>
          {evs.map((ev) => (
            <Card key={ev.id} onPress={() => s.openEvent(ev.id, 'community')} style={{ padding: 14 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <MicroBadge label={ev.type} bg={isMeetup(ev) ? alpha(c.volt, 0.12) : alpha(c.amber, 0.2)} fg={isMeetup(ev) ? c.accent : c.amberText} />
                  <Text style={[t.name, { color: c.txt, marginTop: 6 }]}>{ev.title}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{ev.whenLabel} · {ev.loc}</Text>
                </View>
                <Text style={[t.caption, { color: c.txt3 }]}>{ev.attendees} going</Text>
              </Row>
            </Card>
          ))}
        </View>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Local groups</SectionHeading>
        <View style={{ gap: 10 }}>
          {subs.map((sub) => {
            const joined = s.joinedSubs.includes(sub.id);
            return (
              <Card key={sub.id} style={{ padding: 14 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View>
                    <Text style={[t.name, { color: c.txt }]}>{sub.name}</Text>
                    <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{sub.area} · {sub.members} members</Text>
                  </View>
                  <Pressable onPress={() => s.toggleSub(sub.id)} style={{ borderRadius: 999, borderColor: c.line, borderWidth: 1, backgroundColor: joined ? 'transparent' : c.volt, paddingHorizontal: 16, paddingVertical: 9 }}>
                    <Text style={[t.labelSm, { color: joined ? c.txt2 : c.ink }]}>{joined ? 'Joined' : 'Join'}</Text>
                  </Pressable>
                </Row>
              </Card>
            );
          })}
        </View>
      </View>
    </OverlayScaffold>
  );
}

export function EventDetailOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const ev = D.eventById(s.eventId);
  const going = s.goingEvents.includes(ev.id);
  return (
    <OverlayScaffold
      header={<OverlayHeader title={ev.type} onBack={() => s.set('overlay', s.returnTo)} />}
      bottomBar={
        <View style={{ backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: 1, padding: 16 }}>
          <Pressable onPress={() => s.toggleGoing(ev.id)} style={{ height: 52, borderRadius: 15, backgroundColor: going ? c.surface2 : c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[t.overlayTitle, { fontSize: 16, color: going ? c.txt2 : c.ink }]}>{going ? "You're going ✓" : "I'm going"}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <StripedPlaceholder caption={isMeetup(ev) ? 'meetup image' : 'event image'} height={180} radius={18} />
        <View style={{ marginTop: 14 }}>
          <MicroBadge label={ev.type} bg={isMeetup(ev) ? alpha(c.volt, 0.12) : alpha(c.amber, 0.2)} fg={isMeetup(ev) ? c.accent : c.amberText} />
        </View>
        <Text style={[t.pageTitle, { fontSize: 22, color: c.txt, marginTop: 10 }]}>{ev.title}</Text>
        <View style={{ gap: 12, marginTop: 16 }}>
          <Row gap={12}><Icon name="calendar" size={18} color={c.accent} /><Text style={[t.body, { color: c.soft }]}>{ev.whenLabel}</Text></Row>
          <Row gap={12}><Icon name="map-pin" size={18} color={c.accent} /><Text style={[t.body, { color: c.soft }]}>{ev.loc}</Text></Row>
          <Row gap={12}><Icon name="user" size={18} color={c.accent} /><Text style={[t.body, { color: c.soft }]}>Hosted by {ev.host}</Text></Row>
          <Row gap={12}><Icon name="users" size={18} color={c.accent} /><Text style={[t.body, { color: c.soft }]}>{ev.attendees} going</Text></Row>
        </View>
      </View>
    </OverlayScaffold>
  );
}

export function CreateEventOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const days = ['Wed 02', 'Thu 03', 'Fri 04', 'Sat 05', 'Sun 06', 'Mon 07'];
  const blocked = isExplicit(s.newTitle);
  const canCreate = s.newTitle.trim().length > 0 && !blocked;
  if (s.evtCreated) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Create event" onBack={() => s.set('overlay', 'community')} />}>
        <SuccessBody title="Event created" body="Your meetup is live in the community. Members nearby can now RSVP." />
      </OverlayScaffold>
    );
  }
  return (
    <OverlayScaffold
      header={<OverlayHeader title="Create event" onBack={() => s.set('overlay', 'community')} />}
      bottomBar={<View style={{ padding: 16, backgroundColor: c.bg }}><VoltButton label={blocked ? 'Blocked — flagged to admins' : canCreate ? 'Create event' : 'Name it first'} enabled={canCreate} onPress={s.submitEvent} /></View>}
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Type</SectionHeading>
        <Segmented options={[{ key: 'Meetup', label: 'Meetup' }, { key: 'Event', label: 'Event' }]} selected={s.newType} onSelect={(k) => s.set('newType', k)} fontSize={13} pad={9} />

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Day</SectionHeading>
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {days.map((d, i) => <Chip key={d} label={d} active={s.newDay === i} onPress={() => s.set('newDay', i)} />)}
        </Row>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Time</SectionHeading>
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {D.slotDefs.map((slot, i) => <Chip key={slot} label={slot} active={s.newTime === i} onPress={() => s.set('newTime', i)} />)}
        </Row>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Title</SectionHeading>
        <Field value={s.newTitle} onChange={(v) => s.set('newTitle', v)} placeholder="Saturday long run…" />
        {blocked && <Text style={[t.caption, { color: c.danger, marginTop: 8 }]}>Contains blocked content — this will be flagged.</Text>}
      </View>
    </OverlayScaffold>
  );
}

export function StartCommunityOverlay() {
  const { c } = useTheme();
  const s = useStore();
  const blocked = isExplicit(s.commName);
  const canCreate = s.commName.trim().length > 0 && !blocked;
  if (s.commCreated) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Start community" onBack={s.closeOverlay} />}>
        <SuccessBody title="Community created" body="Invite people and host your first meetup. Official status is granted by admins." />
      </OverlayScaffold>
    );
  }
  return (
    <OverlayScaffold
      header={<OverlayHeader title="Start community" onBack={s.closeOverlay} />}
      bottomBar={<View style={{ padding: 16, backgroundColor: c.bg }}><VoltButton label={blocked ? 'Blocked — flagged to admins' : canCreate ? 'Create community' : 'Name it first'} enabled={canCreate} onPress={s.submitCommunity} /></View>}
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Community name</SectionHeading>
        <Field value={s.commName} onChange={(v) => s.set('commName', v)} placeholder="Downtown Padel Crew…" />
      </View>
    </OverlayScaffold>
  );
}

export function RequestOverlay() {
  const { c } = useTheme();
  const s = useStore();
  const blocked = isExplicit(s.reqName);
  const canSend = s.reqName.trim().length > 0 && !blocked;
  if (s.reqSent) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Request a sport" onBack={s.closeOverlay} />}>
        <SuccessBody title="Request sent" body="Admins will review your request and add it to the app if approved." />
      </OverlayScaffold>
    );
  }
  return (
    <OverlayScaffold
      header={<OverlayHeader title="Request a sport" onBack={s.closeOverlay} />}
      bottomBar={<View style={{ padding: 16, backgroundColor: c.bg }}><VoltButton label={canSend ? 'Send request to admins' : 'Name it first'} enabled={canSend} onPress={s.submitRequest} /></View>}
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Type</SectionHeading>
        <Segmented options={[{ key: 'Hobby', label: 'Hobby' }, { key: 'Sport', label: 'Sport' }]} selected={s.reqType} onSelect={(k) => s.set('reqType', k)} fontSize={13} pad={9} />
        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Name</SectionHeading>
        <Field value={s.reqName} onChange={(v) => s.set('reqName', v)} placeholder="Padel, Salsa, Bouldering…" />
      </View>
    </OverlayScaffold>
  );
}

function SuccessBody({ title, body }: { title: string; body: string }) {
  const { c, t } = useTheme();
  return (
    <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 70 }}>
      <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={34} color={c.ink} />
      </View>
      <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>{title}</Text>
      <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>{body}</Text>
    </View>
  );
}
