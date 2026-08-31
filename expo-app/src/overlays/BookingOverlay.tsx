import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Icon, Row, SectionHeading, VoltButton } from '../components/ui';
import { coachPackageOptions } from '../state/models';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function BookingOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const p = s.personById(s.openId);
  const full = D.fullDaysByCoach[p.id] ?? [];
  const pkgs = coachPackageOptions(p);
  const selectedPkg = pkgs[s.bookPkg] ?? pkgs[0];

  if (s.booked) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Confirmed" onBack={s.closeOverlay} />}>
        <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 60 }}>
          <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={34} color={c.ink} />
          </View>
          <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>You're booked!</Text>
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>
            {selectedPkg.name} with {p.name.split(' ')[0]} · {D.bookingMonthName} {s.bookDay} · {D.slotDefs[s.bookSlot]}
          </Text>
          {s.calSyncOn && (
            <Row gap={8} style={{ marginTop: 16 }}>
              <Icon name="calendar" size={16} color={c.accent} />
              <Text style={[t.labelSm, { color: c.accent }]}>Added to your {s.calProvider === 'GOOGLE' ? 'Google' : s.calProvider === 'APPLE' ? 'Apple' : 'Outlook'} Calendar</Text>
            </Row>
          )}
          <View style={{ height: 24 }} />
          <View style={{ width: '100%' }}>
            <VoltButton label="View my bookings" onPress={s.goToBookings} />
          </View>
        </View>
      </OverlayScaffold>
    );
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title="Book a session" onBack={s.backToPerson} subtitle={p.name} />}
      bottomBar={
        <View style={{ backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: 1, padding: 16 }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[t.body, { color: c.txt2 }]}>Total</Text>
            <Text style={[t.price, { color: c.accent }]}>${selectedPkg.price}</Text>
          </Row>
          <VoltButton label="Confirm booking" onPress={s.confirmBooking} />
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>{D.monthLabel}</SectionHeading>
        <Card style={{ padding: 14 }}>
          <Row style={{ justifyContent: 'space-around', marginBottom: 8 }}>
            {DOW.map((d, i) => (
              <Text key={i} style={[t.caption, { color: c.txt3, width: 36, textAlign: 'center' }]}>{d}</Text>
            ))}
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: D.firstDow }).map((_, i) => (
              <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 42 }} />
            ))}
            {Array.from({ length: D.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isFull = full.includes(day);
              const isPast = day < D.todayNum;
              const sel = s.bookDay === day;
              const disabled = isFull || isPast;
              return (
                <Pressable
                  key={day}
                  onPress={() => !disabled && s.set('bookDay', day)}
                  style={{ width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: sel ? c.volt : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[t.labelSm, { color: sel ? c.ink : disabled ? c.mono : c.txt, textDecorationLine: isFull ? 'line-through' : 'none' }]}>{day}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Time</SectionHeading>
        <Row style={{ flexWrap: 'wrap' }} gap={9}>
          {D.slotDefs.map((slot, i) => {
            const sel = s.bookSlot === i;
            return (
              <Pressable key={slot} onPress={() => s.set('bookSlot', i)} style={{ borderRadius: 12, backgroundColor: sel ? c.volt : c.surface, borderColor: sel ? c.volt : c.line, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 11 }}>
                <Text style={[t.labelSm, { color: sel ? c.ink : c.txt }]}>{slot}</Text>
              </Pressable>
            );
          })}
        </Row>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Package</SectionHeading>
        <View style={{ gap: 10 }}>
          {pkgs.map((pk, i) => {
            const sel = s.bookPkg === i;
            return (
              <Pressable key={pk.name} onPress={() => s.set('bookPkg', i)}>
                <Card background={sel ? alpha(c.volt, 0.1) : c.surface} borderColor={sel ? c.volt : c.line} style={{ padding: 14 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View>
                      <Text style={[t.name, { color: c.txt }]}>{pk.name}</Text>
                      <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{pk.note}</Text>
                    </View>
                    <Text style={[t.price, { color: c.accent }]}>${pk.price}</Text>
                  </Row>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>
    </OverlayScaffold>
  );
}
