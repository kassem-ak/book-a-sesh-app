import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Icon, Row, SectionHeading, VoltButton } from '../components/ui';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// Coach-side day view from the board: a week strip, the day's booked slots with
// capacity chips, "Mark as Done", and the session-end confirmation modal.
const WEEK = [1, 2, 3, 4, 5, 6, 7];

const SLOTS = [
  { time: '6:30 AM', who: 'Sally Sanders.', cap: '1/10' },
  { time: '8:00 AM', who: 'Nour kaawar', cap: '3/10' },
  { time: '12:00 PM', who: 'mohammad mahmoud', cap: '5/5' },
  { time: '5:30 PM', who: 'Ali hassan', cap: '1/1' },
  { time: '6:30 PM', who: 'Elias koko', cap: '6/12' },
  { time: '7:30 PM', who: 'Sally Sanders.', cap: '5/5' },
];

export function CoachDayViewOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [day, setDay] = useState(2);
  const [selected, setSelected] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const slot = SLOTS[selected];

  return (
    <OverlayScaffold
      header={<OverlayHeader title="Book Marcus" onBack={s.closeOverlay} />}
      bottomBar={
        <View style={{ padding: 16, backgroundColor: c.bg }}>
          <VoltButton
            label={done[slot.time] ? 'Marked as Done' : 'Mark as Done'}
            enabled={!done[slot.time]}
            onPress={() => setConfirming(true)}
          />
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>{D.monthLabel}</SectionHeading>
        <Row gap={6}>
          <Icon name="chevron-left" size={18} color={c.txt3} />
          {WEEK.map((d) => {
            const active = d === day;
            return (
              <Pressable
                key={d}
                onPress={() => setDay(d)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? c.volt : 'transparent',
                }}
              >
                <Text style={[t.labelSm, { color: active ? c.ink : c.txt2 }]}>{d}</Text>
              </Pressable>
            );
          })}
          <Icon name="chevron-right" size={18} color={c.txt3} />
        </Row>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Time</SectionHeading>
        <View style={{ gap: 9 }}>
          {SLOTS.map((sl, i) => {
            const active = i === selected;
            return (
              <Pressable key={sl.time} onPress={() => setSelected(i)}>
                <Card
                  background={active ? c.volt : c.surface}
                  borderColor={active ? c.volt : c.line}
                  radius={12}
                >
                  <Row style={{ paddingHorizontal: 14, paddingVertical: 11 }} gap={12}>
                    <Text style={[t.labelSm, { color: active ? c.ink : c.txt }]}>{sl.time}</Text>
                    <Text style={[t.bodySm, { color: active ? c.ink : c.txt2, flex: 1 }]}>{sl.who}</Text>
                    <View style={{ borderRadius: 999, backgroundColor: active ? alpha('#0D0E11', 0.15) : c.surface2, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={[t.caption, { color: active ? c.ink : c.txt2 }]}>{sl.cap}</Text>
                    </View>
                    {done[sl.time] && <Icon name="check" size={15} color={active ? c.ink : c.accent} />}
                  </Row>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* session end confirmation */}
      <Modal transparent visible={confirming} animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 }}>
          <Card background={c.surface} borderColor={c.volt} style={{ width: '100%', padding: 18 }}>
            <Text style={[t.overlayTitle, { fontSize: 17, color: c.accent }]}>Hey Champ!</Text>
            <Text style={[t.name, { color: c.txt, marginTop: 6 }]}>
              Did you finish your {slot.time} session?
            </Text>
            <Row style={{ marginTop: 16 }} gap={10}>
              <Pressable
                onPress={() => {
                  setDone({ ...done, [slot.time]: true });
                  setConfirming(false);
                }}
                style={{ flex: 1, borderRadius: 12, backgroundColor: c.volt, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: c.ink }]}>YES</Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirming(false)}
                style={{ flex: 1, borderRadius: 12, backgroundColor: c.surface2, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={[t.labelSm, { fontFamily: t.microBadge.fontFamily, color: c.txt2 }]}>NO</Text>
              </Pressable>
            </Row>
          </Card>
        </View>
      </Modal>
    </OverlayScaffold>
  );
}
