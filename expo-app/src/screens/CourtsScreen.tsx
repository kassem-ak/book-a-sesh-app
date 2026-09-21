import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Avatar, Button, Card, Icon, MicroBadge, Row, StripedPlaceholder,
} from '../components/ui';
import { Venue } from '../lib/courts';
import { formatDistanceKm, distanceKmBetween, getDevicePoint, GeoPoint } from '../lib/geo';
import {
  capacityLabel,
  entryFeeLabel,
  eventDatesLabel,
  perHourLabel,
  venueById,
  venueHoursLabel,
  venuePhotoCaptions,
  venueStatusLabel,
} from '../state/courtsData';
import { useStore } from '../state/store';
import { alpha, avatarSize, radii, spacing, useTheme } from '../theme';

type Tab = 'courts' | 'events' | 'gallery';

const TABS: [Tab, string][] = [
  ['courts', 'Courts'],
  ['events', 'Events'],
  ['gallery', 'Gallery'],
];

const TAP = { top: 8, bottom: 8, left: 8, right: 8 };

// Court / tournament RSVP. The store resolves the subject from the loaded
// venues and refuses to open when it cannot be priced or the venue is closed.
const openRsvp = (venueId: string, kind: 'court' | 'event', id: string) =>
  useStore.getState().openRsvp({ venueId, kind, id });

export function CourtsScreen() {
  const [venueId, setVenueId] = useState<string | null>(null);
  const [entryTab, setEntryTab] = useState<Tab>('courts');
  const venues = useStore((s) => s.venues);
  const loadVenues = useStore((s) => s.loadVenues);
  const [devicePoint, setDevicePoint] = useState<GeoPoint | null>(null);

  useEffect(() => {
    void loadVenues();
  }, [loadVenues]);

  // Distance is only rendered when both ends are real; a denied permission or a
  // venue without coordinates simply shows no distance.
  useEffect(() => {
    let active = true;
    void getDevicePoint().then((point) => {
      if (active) setDevicePoint(point);
    });
    return () => {
      active = false;
    };
  }, []);

  const venue = venueById(venues, venueId);
  if (!venueId || !venue)
    return (
      <AllCourtsView
        devicePoint={devicePoint}
        onOpen={(id, tab) => {
          setEntryTab(tab ?? 'courts');
          setVenueId(id);
        }}
      />
    );
  return <VenueProfile venue={venue} entryTab={entryTab} onBack={() => setVenueId(null)} />;
}

// Small 40px surface icon button shared by both headers.
function HeaderIconButton({
  icon,
  label,
  onPress,
  volt,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
  volt?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={TAP}
      style={{
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: volt ? c.volt : c.surface,
        borderColor: volt ? c.volt : c.line,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={volt ? 18 : 19} color={volt ? c.ink : c.txt} />
    </Pressable>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  const { c, t } = useTheme();
  return (
    <Text accessibilityRole="text" style={[t.bodySm, { color: c.txt3, marginTop: 18 }]}>
      {children}
    </Text>
  );
}

// ---- ALL Courts view -------------------------------------------------------
function AllCourtsView({
  devicePoint,
  onOpen,
}: {
  devicePoint: GeoPoint | null;
  onOpen: (id: string, tab?: Tab) => void;
}) {
  const { c, t } = useTheme();
  const venues = useStore((s) => s.venues);
  const loading = useStore((s) => s.venuesLoading);
  const error = useStore((s) => s.venuesError);
  const loadVenues = useStore((s) => s.loadVenues);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 26 }}>
      <View style={{ paddingHorizontal: spacing.screen, paddingTop: 20 }}>
        <Row style={{ marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={[t.pageTitle, { color: c.txt }]}>Courts</Text>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>Book courts, join tournaments</Text>
          </View>
          <Row gap={9}>
            {venues.length > 0 && (
              <HeaderIconButton
                icon="image"
                label="Browse venue galleries"
                onPress={() => onOpen(venues[0].id, 'gallery')}
              />
            )}
            {/* Venue registration reuses the shared registration form (handoff
                v2 section 9), opened with regKind = 'venue'. */}
            <HeaderIconButton
              icon="plus"
              label="Register a venue"
              onPress={() => useStore.getState().openRegistration('venue')}
            />
          </Row>
        </Row>

        <Row
          style={{
            backgroundColor: c.surface,
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: radii.input,
            paddingHorizontal: 14,
            paddingVertical: 13,
          }}
        >
          <Text style={[t.label, { color: c.txt, flex: 1 }]}>All sports and hobbies</Text>
          <Icon name="chevron-down" size={18} color={c.txt3} />
        </Row>
        <Row
          style={{
            marginTop: 10,
            backgroundColor: c.surface,
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: radii.input,
            paddingHorizontal: 14,
            paddingVertical: 13,
          }}
          gap={10}
        >
          <Icon name="search" size={18} color={c.txt3} />
          <Text style={[t.body, { color: c.txt3 }]}>Search venues, courts</Text>
        </Row>

        {loading && venues.length === 0 && <Note>Loading venues…</Note>}
        {!loading && error && (
          <View style={{ marginTop: 18, gap: 10, alignItems: 'flex-start' }}>
            {/* The message is not a control. It used to be inside the tap
                target, which made the whole failure look pressable and gave
                a screen reader one long button where a sentence belonged. */}
            <Text style={[t.bodySm, { color: c.danger }]}>{error}</Text>
            <Button label="Try again" icon="refresh-cw" tone="danger"
              accessibilityLabel="Retry loading venues" onPress={() => void loadVenues()} />
          </View>
        )}
        {!loading && !error && venues.length === 0 && <Note>No venues listed yet.</Note>}

        <View style={{ marginTop: 16, gap: spacing.listGap }}>
          {venues.map((v) => {
            const open = v.status === 'open';
            const distance = formatDistanceKm(distanceKmBetween(devicePoint, v.point));
            return (
              <Pressable
                key={v.id}
                onPress={() => onOpen(v.id)}
                accessibilityRole="button"
                accessibilityLabel={
                  v.name +
                  ', ' +
                  v.city +
                  ' ' +
                  v.sport +
                  (distance ? ', ' + distance + ' away' : '') +
                  ', ' +
                  (open ? 'open' : 'closed')
                }
              >
                <Card style={{ padding: 11 }}>
                  <StripedPlaceholder caption={v.name} height={126} />
                  <Row style={{ marginTop: 11, paddingHorizontal: 4, paddingBottom: 3 }} gap={10}>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.name, { color: c.txt }]}>{v.name}</Text>
                      {/* v2 meta format: "City · Sport" */}
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>
                        {v.city} · {v.sport}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {/* No coordinates or no location permission = no distance
                          claim, rather than a made-up one. */}
                      {distance && <Text style={[t.priceSm, { color: c.accent }]}>{distance}</Text>}
                      <Text style={[t.caption, { color: open ? c.txt2 : c.txt3, marginTop: 2 }]}>
                        {venueStatusLabel(v)}
                      </Text>
                    </View>
                  </Row>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ---- Venue profile ---------------------------------------------------------
function VenueProfile({ venue, entryTab, onBack }: { venue: Venue; entryTab: Tab; onBack: () => void }) {
  const { c, t } = useTheme();
  const v = venue;
  const open = v.status === 'open';
  const [tab, setTab] = useState<Tab>(entryTab);
  const [shown, setShown] = useState(6);
  const photos = venuePhotoCaptions(v);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 26 }}>
        {/* v2 top bar: back · "Courts" · gallery icon · volt + */}
        <Row style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }} gap={10}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to courts"
            hitSlop={TAP}
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: c.surface,
              borderColor: c.line,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevron-left" size={20} color={c.txt} />
          </Pressable>
          <Text style={[t.overlayTitle, { color: c.txt, flex: 1 }]}>Courts</Text>
          <HeaderIconButton icon="image" label="Open the gallery tab" onPress={() => setTab('gallery')} />
        </Row>

        <StripedPlaceholder caption={v.name} height={176} radius={0} />

        <View style={{ paddingHorizontal: spacing.screen }}>
          <Row style={{ marginTop: -30, alignItems: 'flex-end' }} gap={12}>
            <View
              style={{
                width: avatarSize.venue,
                height: avatarSize.venue,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: c.volt,
                backgroundColor: c.surface2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar
                initials={v.code ?? v.name.slice(0, 2).toUpperCase()}
                size={58}
                radius={radii.avatar}
                bg={v.tint ?? c.surface2}
                fontSize={17}
              />
            </View>
          </Row>

          <Row style={{ marginTop: 14, alignItems: 'flex-start' }} gap={10}>
            <View style={{ flex: 1 }}>
              <Text style={[t.overlayTitle, { fontSize: 22, color: c.txt }]}>{v.name}</Text>
              <Text style={[t.bodySm, { color: c.soft, marginTop: 6 }]}>Open : {v.openDays}</Text>
              <Text style={[t.bodySm, { color: c.soft, marginTop: 2 }]}>
                Operation hours : {venueHoursLabel(v)}
              </Text>
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{v.city}</Text>
            </View>
            <MicroBadge
              label={venueStatusLabel(v)}
              bg={open ? alpha(c.volt, 0.12) : alpha(c.danger, 0.12)}
              fg={open ? c.accent : c.danger}
            />
          </Row>

          {/* Divided tabs: Courts | Events | Gallery */}
          <Row style={{ justifyContent: 'center', marginTop: 20, marginBottom: 18 }}>
            {TABS.map(([k, label], i) => (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                accessibilityRole="tab"
                accessibilityLabel={label + ' tab'}
                accessibilityState={{ selected: tab === k }}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: 24,
                  borderRightWidth: i < TABS.length - 1 ? 1 : 0,
                  borderRightColor: c.line,
                  borderBottomWidth: 2,
                  borderBottomColor: tab === k ? c.volt : 'transparent',
                }}
              >
                <Text style={[t.labelSm, { fontSize: 13.5, color: tab === k ? c.txt : c.txt3 }]}>{label}</Text>
              </Pressable>
            ))}
          </Row>

          {!open && (
            <Text style={[t.bodySm, { color: c.txt3, marginBottom: 14 }]}>
              {v.name} is closed, so nothing here can be booked right now.
            </Text>
          )}

          {tab === 'courts' && (
            <View style={{ gap: spacing.listGap }}>
              {v.courts.length === 0 && <Text style={[t.bodySm, { color: c.txt3 }]}>No courts listed yet.</Text>}
              {v.courts.map((court) => (
                <Card key={court.id} style={{ padding: 11 }}>
                  <StripedPlaceholder caption={court.name} height={112} />
                  <Row style={{ marginTop: 11, paddingHorizontal: 4, paddingBottom: 3 }} gap={10}>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.sectionHeading, { fontSize: 13, letterSpacing: 0.4, color: c.txt }]}>
                        {court.name}
                      </Text>
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{capacityLabel(court.capacity)}</Text>
                    </View>
                    <Text style={[t.price, { fontSize: 16, color: c.accent }]}>
                      {perHourLabel(court.priceCentsPerHour)}
                    </Text>
                    <RsvpButton venueId={v.id} kind="court" id={court.id} title={court.name} open={open} />
                  </Row>
                </Card>
              ))}
            </View>
          )}

          {tab === 'events' && (
            <View style={{ gap: spacing.listGap }}>
              {v.events.length === 0 && (
                <Text style={[t.bodySm, { color: c.txt3 }]}>No tournaments scheduled yet.</Text>
              )}
              {v.events.map((ev) => (
                <Card key={ev.id} style={{ padding: 11 }}>
                  <View>
                    <StripedPlaceholder caption={ev.name} height={112} />
                    <View style={{ position: 'absolute', top: 8, left: 8 }}>
                      <MicroBadge label="Tournament" bg={alpha(c.bg, 0.72)} fg={c.volt} />
                    </View>
                  </View>
                  <Row style={{ marginTop: 11, paddingHorizontal: 4, paddingBottom: 3 }} gap={10}>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.sectionHeading, { fontSize: 13, letterSpacing: 0.4, color: c.txt }]}>
                        {ev.name}
                      </Text>
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>{eventDatesLabel(ev)}</Text>
                    </View>
                    <Text style={[t.priceSm, { color: c.accent }]}>{entryFeeLabel(ev.priceCents)}</Text>
                    <RsvpButton venueId={v.id} kind="event" id={ev.id} title={ev.name} open={open} />
                  </Row>
                </Card>
              ))}
            </View>
          )}

          {tab === 'gallery' && (
            <View>
              {photos.length === 0 && (
                <Text style={[t.bodySm, { color: c.txt3 }]}>This venue has not added photos yet.</Text>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
                {photos.slice(0, shown).map((caption) => (
                  <View key={caption} style={{ width: '31.5%' }}>
                    <StripedPlaceholder caption={caption} height={92} />
                    <Text style={[t.caption, { color: c.txt2, marginTop: 6, textAlign: 'center' }]}>{caption}</Text>
                  </View>
                ))}
              </View>
              {shown < photos.length && (
                <Pressable
                  onPress={() => setShown(shown + 6)}
                  accessibilityRole="button"
                  accessibilityLabel="Load more photos"
                  style={{ marginTop: 20, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={[t.labelSm, { color: c.txt2 }]}>Load More</Text>
                  <Icon name="chevron-down" size={18} color={c.txt3} />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function RsvpButton({
  venueId,
  kind,
  id,
  title,
  open,
}: {
  venueId: string;
  kind: 'court' | 'event';
  id: string;
  title: string;
  /** A closed venue is a guaranteed server refusal, so the CTA says so instead. */
  open: boolean;
}) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={open ? () => openRsvp(venueId, kind, id) : undefined}
      accessibilityRole="button"
      accessibilityLabel={open ? 'RSVP for ' + title : title + ' is closed and cannot be booked'}
      accessibilityState={{ disabled: !open }}
      hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
      style={{
        borderRadius: radii.pill,
        backgroundColor: open ? c.volt : c.surface2,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text style={[t.microBadge, { fontSize: 12, letterSpacing: 0.3, color: open ? c.ink : c.txt3 }]}>
        {open ? 'RSVP' : 'CLOSED'}
      </Text>
    </Pressable>
  );
}
