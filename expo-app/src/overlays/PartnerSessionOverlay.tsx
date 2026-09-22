import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { MissingSubject, OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { ActionBar, Chip, Row, SectionHeading, TAP_SLOP, VoltButton } from '../components/ui';
import { analyticsErrorCode, track } from '../lib/analytics';
import { proposePartnerSession } from '../lib/partners';
import { bookableDays } from './BookingOverlay';
import { bookingDayLabel, errorMessage, scheduledFor, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// Asking a peer to train. No price, no packages, no commission -- the whole
// point of a partner session is that it is free.
//
// The day and slot list is the same builder the coach booking uses, called with
// a null schedule. A partner has no published availability, and the null case
// already means "offer the suggested times": one source of truth for what a
// bookable day looks like, rather than a second calendar that drifts.
export function PartnerSessionOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const p = s.personById(s.openId);

  const days = useMemo(() => bookableDays(null), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hooks first: Root replaces the people list on refresh, so `p` can vanish
  // while this overlay is open.
  if (!p) return <MissingSubject title="Train together" message="This person is no longer available." onBack={s.backToPerson} />;

  const day = days[dayIndex] ?? days[0];
  const chosenSlot = slot && day?.slots.includes(slot) ? slot : day?.slots[0] ?? null;

  const send = async () => {
    if (!day || !chosenSlot) return;
    setBusy(true);
    setError(null);
    try {
      await proposePartnerSession({
        partnerId: p.id,
        scheduledFor: scheduledFor(day.date, chosenSlot),
        slotLabel: chosenSlot,
        note,
      });
      track('partner_session_proposed');
      setSent(true);
    } catch (e) {
      track('write_failed', { error_code: analyticsErrorCode(e) });
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <OverlayScaffold
        header={<OverlayHeader title="Invitation sent" onBack={s.closeOverlay} />}
        // The way out of a confirmation is still the screen's one verb, so it
        // belongs in the bar with every other primary rather than floating at
        // the end of a column that grows with the coach's name.
        bottomBar={<ActionBar><VoltButton label="Done" onPress={s.closeOverlay} /></ActionBar>}
      >
        <View style={{ paddingHorizontal: 18, paddingTop: 40, alignItems: 'center', gap: 10 }}>
          <Text style={[t.overlayTitle, { fontSize: 22, color: c.txt, textAlign: 'center' }]}>
            Asked {p.name.split(' ')[0]} to train
          </Text>
          <Text style={[t.bodyLg, { color: c.txt2, textAlign: 'center' }]}>
            {day && chosenSlot ? `${bookingDayLabel(day.date)} · ${chosenSlot}` : ''}
          </Text>
          <Text style={[t.bodySm, { color: c.txt3, textAlign: 'center' }]}>
            It shows in your calendar as pending until they accept. You will see their answer in notifications.
          </Text>
        </View>
      </OverlayScaffold>
    );
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title="Train together" subtitle={p.name} onBack={s.backToPerson} />}
      bottomBar={
        <ActionBar note={
          <>
            {/* What was picked, beside the button that sends it. The day and
                the time are chosen at the top of a list long enough to scroll
                them off, and nobody should have to scroll back to check. */}
            {day && chosenSlot && (
              <Text style={[t.bodySm, { color: c.txt }]}>
                {bookingDayLabel(day.date)} · {chosenSlot}
              </Text>
            )}
            <Text style={[t.caption, { color: c.txt3 }]}>
              Free — you are arranging a session between the two of you, not booking a coach.
            </Text>
            {/* A send that fails, fails here. At the top of the content it was
                announced somewhere the person was not looking. */}
            {error && (
              <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>
            )}
          </>
        }>
          <VoltButton label="Send invitation" busy={busy} busyLabel="Sending…"
            enabled={Boolean(day && chosenSlot) && !busy} onPress={() => void send()} />
        </ActionBar>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Day</SectionHeading>
        <Row style={{ flexWrap: 'wrap' }} gap={9}>
          {days.map((entry, index) => {
            const selected = index === dayIndex;
            return (
              <Pressable key={entry.date} accessibilityRole="button"
                accessibilityState={{ selected }} accessibilityLabel={bookingDayLabel(entry.date)}
                onPress={() => { setDayIndex(index); setSlot(null); }}
                // Two stacked lines of small type come out just under the 48dp
                // floor, and these sit nine apart in a wrapping grid of 28.
                hitSlop={TAP_SLOP}
                style={{ borderRadius: 12, backgroundColor: selected ? c.volt : c.surface,
                  borderColor: selected ? c.volt : c.line, borderWidth: 1,
                  paddingHorizontal: 13, paddingVertical: 9, minWidth: 54, alignItems: 'center' }}>
                <Text style={[t.caption, { color: selected ? c.ink : c.txt3 }]}>{entry.dow}</Text>
                <Text style={[t.labelSm, { color: selected ? c.ink : c.txt }]}>{entry.day}</Text>
              </Pressable>
            );
          })}
        </Row>

        {day && <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Time</SectionHeading>
          <Row style={{ flexWrap: 'wrap' }} gap={9}>
            {day.slots.map((option) => {
              const selected = chosenSlot === option;
              return (
                <Chip key={option} label={option} active={selected}
                  onPress={() => setSlot(option)} />
              );
            })}
          </Row>
        </>}

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Add a note</SectionHeading>
        <TextInput value={note} onChangeText={setNote} multiline accessibilityLabel="Note for your partner"
          placeholder="Where, and what you want to work on" placeholderTextColor={c.txt3} textAlignVertical="top"
          style={[t.body, { color: c.txt, minHeight: 90, borderWidth: 1, borderColor: c.line,
            borderRadius: 16, backgroundColor: alpha(c.surface, 1), padding: 14 }]} />
      </View>
    </OverlayScaffold>
  );
}

