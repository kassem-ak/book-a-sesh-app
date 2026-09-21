import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FormSheet, IconButton, Row, VoltButton } from './ui';
import { dateKey, monthCells, MONTH_NAMES } from '../lib/calendarGrid';
import { alpha, useTheme } from '../theme';

// Pick a date from a month, rather than from a list of the next ninety days.
//
// A list is fine for "tomorrow" and useless for "the second week of December":
// nobody counts ninety chips. A month grid is how people already think about
// dates they are planning around.
//
// Hand-rolled, sharing its maths with the bookings calendar. The whole of it is
// "which weekday does the 1st fall on, and how many days are in the month", and
// both come free from the Date constructor.
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function DatePickerSheet({
  visible,
  title,
  subtitle,
  confirmLabel,
  busy = false,
  taken = [],
  onClose,
  onConfirm,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  confirmLabel: string;
  busy?: boolean;
  /** Dates already spoken for, shown but not selectable. */
  taken?: string[];
  onClose: () => void;
  onConfirm: (date: string) => void;
  children?: React.ReactNode;
}) {
  const { c, t } = useTheme();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  const cells = useMemo(() => monthCells(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const takenSet = useMemo(() => new Set(taken), [taken]);
  const todayKey = dateKey(today);

  const step = (months: number) =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + months, 1));
  // There is no reason to close a date that has already happened, and letting
  // someone page backwards only to find every day disabled is a dead end.
  const atFirstMonth =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  return (
    <FormSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={() => { if (!busy) { setSelected(null); onClose(); } }}
      footer={
        <VoltButton label={confirmLabel} busy={busy} busyLabel="Saving…"
          enabled={Boolean(selected) && !busy}
          onPress={() => { if (selected) onConfirm(selected); }} />
      }
    >
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <IconButton icon="chevron-left" accessibilityLabel="Previous month"
          onPress={() => step(-1)} enabled={!atFirstMonth} />
        <Text style={[t.labelSm, { color: c.txt }]}>
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <IconButton icon="chevron-right" accessibilityLabel="Next month" onPress={() => step(1)} />
      </Row>

      <Row>
        {DOW.map((letter, index) => (
          <View key={`${letter}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[t.caption, { color: c.txt3 }]}>{letter}</Text>
          </View>
        ))}
      </Row>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, index) => {
          if (day === null) return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const key = dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day));
          const past = key < todayKey;
          const already = takenSet.has(key);
          const disabled = past || already;
          const isSelected = key === selected;
          return (
            <Pressable key={key} disabled={disabled} onPress={() => setSelected(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled }}
              accessibilityLabel={`${day} ${MONTH_NAMES[cursor.getMonth()]}${already ? ', already closed' : ''}`}
              style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                opacity: past ? 0.25 : 1,
                backgroundColor: isSelected ? c.volt : already ? alpha(c.danger, 0.15) : 'transparent',
                borderWidth: key === todayKey && !isSelected ? 1 : 0, borderColor: c.line }}>
                <Text style={[t.bodySm, {
                  color: isSelected ? c.ink : already ? c.danger : c.txt,
                }]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {children}
    </FormSheet>
  );
}
