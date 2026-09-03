import React from 'react';
import { Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Icon, Row, SectionHeading } from '../components/ui';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function CoachDayViewOverlay() {
  const { c, t } = useTheme();
  const s = useStore();

  return (
    <OverlayScaffold header={<OverlayHeader title="Today's sessions" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Today</SectionHeading>
        <Card style={{ padding: 18 }}>
          <Row gap={12} style={{ alignItems: 'flex-start' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                backgroundColor: alpha(c.volt, 0.12),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="calendar" size={20} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.name, { color: c.txt }]}>Coach day view unavailable</Text>
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 5, lineHeight: 20 }]}>
                Confirmed coach sessions will appear here after the live coach schedule is connected.
              </Text>
            </View>
          </Row>
        </Card>
      </View>
    </OverlayScaffold>
  );
}
