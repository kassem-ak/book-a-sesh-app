import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Row, Segmented, SectionHeading, Toggle, VoltButton } from '../components/ui';
import { rsvpSubject } from '../state/courtsData';
import { fmtMoney, useStore } from '../state/store';
import { radii, useTheme } from '../theme';

// Delta section C. Booking type, hours stepper, equipment rent (+$6/h),
// add-a-coach (routes into the coach calendar), live total.
export const RSVP_TYPES = ['Single', 'Teams', 'Member of team'] as const;
export type RsvpType = (typeof RSVP_TYPES)[number];

export const GEAR_PER_HOUR = 6;
const MIN_HOURS = 1;
const MAX_HOURS = 6;

export function RsvpSheet() {
  const { c, t } = useTheme();
  const s = useStore();

  const subject = rsvpSubject(s.rsvpRef);
  const target = subject?.title ?? s.rsvpTarget ?? null;
  const type = s.rsvpType as RsvpType;
  const hours = Math.max(MIN_HOURS, Math.round(Number(s.rsvpHours)) || MIN_HOURS);
  const gear = s.rsvpGear;
  const coach = s.rsvpCoach;

  const venue = subject?.venue;
  const perHour = s.rsvpPerHour;
  // One source of truth for the money: the store computes what gets recorded.
  const total = s.rsvpTotal();

  const close = () => s.set('sheet', null);
  const setHours = (n: number) => s.set('rsvpHours', Math.min(MAX_HOURS, Math.max(MIN_HOURS, n)));

  // Records the reservation and routes into the coach calendar when asked.
  const confirm = () => s.confirmRsvp();

  return (
    <Sheet
      title={target ? 'RSVP · ' + target : 'RSVP'}
      subtitle={
        (venue ? venue.name + ' · ' : '') +
        fmtMoney(s.rsvpPricePerHour) +
        (perHour ? ' / hour' : ' entry')
      }
      onClose={close}
      footer={
        <VoltButton label={coach ? 'Continue to coach calendar' : 'Confirm RSVP'} onPress={confirm} />
      }
    >
      <SectionHeading style={{ color: c.txt3, marginBottom: 9 }}>Booking type</SectionHeading>
      <Segmented
        options={RSVP_TYPES.map((k) => ({ key: k, label: k }))}
        selected={type}
        onSelect={(k) => s.set('rsvpType', k)}
        fontSize={12.5}
        pad={11}
      />

      {/* A tournament is a flat per-team entry fee, so hours and hourly
          equipment hire do not apply to it. */}
      {perHour && (
        <>
      <SectionHeading style={{ color: c.txt3, marginTop: 20, marginBottom: 9 }}>Number of hours</SectionHeading>
      <Row
        style={{
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: radii.input,
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}
        gap={12}
      >
        <StepperButton
          label="Decrease hours"
          glyph="−"
          disabled={hours <= MIN_HOURS}
          onPress={() => setHours(hours - 1)}
        />
        <Text
          accessibilityRole="text"
          accessibilityLabel={hours + (hours === 1 ? ' hour' : ' hours') + ' booked'}
          style={[t.overlayTitle, { fontSize: 17, color: c.txt, flex: 1, textAlign: 'center' }]}
        >
          {hours} {hours === 1 ? 'hour' : 'hours'}
        </Text>
        <StepperButton
          label="Increase hours"
          glyph="+"
          disabled={hours >= MAX_HOURS}
          onPress={() => setHours(hours + 1)}
        />
      </Row>

      <ToggleRow
        title="Equipment rent"
        subtitle={'Rackets & balls · +' + fmtMoney(GEAR_PER_HOUR) + ' / hour'}
        value={gear}
        onChange={(v) => s.set('rsvpGear', v)}
        style={{ marginTop: 20 }}
      />
        </>
      )}
      <ToggleRow
        title="Add a coach"
        subtitle="Opens the coach's calendar next · billed with the coach"
        value={coach}
        onChange={(v) => s.set('rsvpCoach', v)}
        style={{ marginTop: 11 }}
      />

      <Row
        style={{
          marginTop: 20,
          backgroundColor: c.surface2,
          borderRadius: radii.input,
          paddingHorizontal: 15,
          paddingVertical: 13,
        }}
      >
        <Text style={[t.label, { color: c.txt, flex: 1 }]}>Total</Text>
        <Text style={[t.price, { fontSize: 18, color: c.accent }]}>{fmtMoney(total)}</Text>
      </Row>
    </Sheet>
  );
}

function StepperButton({
  label,
  glyph,
  disabled,
  onPress,
}: {
  label: string;
  glyph: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={[t.overlayTitle, { fontSize: 17, color: c.txt2 }]}>{glyph}</Text>
    </Pressable>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  style,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  style?: React.ComponentProps<typeof View>['style'];
}) {
  const { c, t } = useTheme();
  return (
    <Row
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: radii.input,
          paddingHorizontal: 14,
          paddingVertical: 13,
          minHeight: 44,
        },
        style,
      ]}
      gap={12}
    >
      <View style={{ flex: 1 }}>
        <Text style={[t.label, { fontSize: 14.5, color: c.txt }]}>{title}</Text>
        <Text style={[t.caption, { fontSize: 12, color: c.txt2, marginTop: 2 }]}>{subtitle}</Text>
      </View>
      <View accessible accessibilityLabel={title}>
        <Toggle value={value} onChange={onChange} />
      </View>
    </Row>
  );
}
