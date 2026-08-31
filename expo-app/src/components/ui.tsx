import { Feather } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { alpha, useTheme } from '../theme';

type IconName = React.ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  return <Feather name={name} size={size} color={color} />;
}

// ---- Card ----
export function Card({
  children,
  onPress,
  background,
  borderColor,
  radius = 18,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  background?: string;
  borderColor?: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const box: StyleProp<ViewStyle> = {
    backgroundColor: background ?? c.surface,
    borderColor: borderColor ?? c.line,
    borderWidth: 1,
    borderRadius: radius,
  };
  if (onPress)
    return (
      <Pressable onPress={onPress} style={[box, style]}>
        {children}
      </Pressable>
    );
  return <View style={[box, style]}>{children}</View>;
}

// ---- Volt CTA button ----
export function VoltButton({
  label,
  onPress,
  enabled = true,
  height = 52,
}: {
  label: string;
  onPress: () => void;
  enabled?: boolean;
  height?: number;
}) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={enabled ? onPress : undefined}
      style={{
        height,
        borderRadius: 15,
        backgroundColor: enabled ? c.volt : c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[t.overlayTitle, { fontSize: 16, color: enabled ? c.ink : c.txt3 }]}>{label}</Text>
    </Pressable>
  );
}

// ---- Micro badge ----
export function MicroBadge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  const { t } = useTheme();
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
      <Text style={[t.microBadge, { color: fg, textTransform: 'uppercase' }]}>{label}</Text>
    </View>
  );
}

// ---- Section heading ----
export function SectionHeading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c, t } = useTheme();
  return (
    <Text style={[t.sectionHeading, { color: c.txt3, textTransform: 'uppercase' }, style]}>{children}</Text>
  );
}

// ---- Avatar tile ----
export function Avatar({
  initials,
  size = 54,
  radius = 14,
  fontSize = 18,
  bg,
}: {
  initials: string;
  size?: number;
  radius?: number;
  fontSize?: number;
  bg?: string;
}) {
  const { c, t } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg ?? c.avatarBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[t.initials, { fontSize, color: '#F2F3F5' }]}>{initials}</Text>
    </View>
  );
}

// ---- Toggle (46x26 track, 20 knob) ----
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        backgroundColor: value ? c.volt : '#3A3F47',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          marginLeft: value ? 23 : 3,
        }}
      />
    </Pressable>
  );
}

// ---- Segmented control ----
export interface SegOption {
  key: string;
  label: string;
}
export function Segmented({
  options,
  selected,
  onSelect,
  fontSize = 14,
  pad = 12,
}: {
  options: SegOption[];
  selected: string;
  onSelect: (k: string) => void;
  fontSize?: number;
  pad?: number;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 4 }}>
      {options.map((o) => {
        const active = o.key === selected;
        return (
          <Pressable
            key={o.key}
            onPress={() => onSelect(o.key)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: pad, borderRadius: 11, backgroundColor: active ? c.volt : 'transparent' }}
          >
            <Text style={[t.label, { fontSize, color: active ? c.ink : c.txt2 }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- Choice chip (pill) ----
export function Chip({ label, active, onPress, fill }: { label: string; active: boolean; onPress: () => void; fill?: boolean }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: fill ? 1 : undefined,
        alignItems: fill ? 'center' : undefined,
        borderRadius: 999,
        backgroundColor: active ? c.volt : c.surface,
        borderColor: active ? c.volt : c.line,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}
    >
      <Text style={[t.labelSm, { color: active ? c.ink : c.txt2 }]}>{label}</Text>
    </Pressable>
  );
}

// ---- Text field ----
export function Field({
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
  width,
  textColor,
  align = 'left',
  secure = false,
  icon,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad' | 'email-address' | 'phone-pad';
  width?: number;
  textColor?: string;
  align?: 'left' | 'center';
  secure?: boolean;
  icon?: IconName;
}) {
  const { c, t } = useTheme();
  const [focused, setFocused] = React.useState(false);
  // Board annotation: the leading icon switches to volt (#C6F24E) while typing.
  const iconColor = focused || value.length > 0 ? c.accent : c.txt3;
  return (
    <View style={{ width, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
      {icon ? <Icon name={icon} size={17} color={iconColor} /> : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.txt3}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize={secure || keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[t.body, { flex: 1, color: textColor ?? c.txt, textAlign: align, padding: 0 }]}
      />
    </View>
  );
}

// ---- Striped placeholder (image stand-in) ----
export function StripedPlaceholder({ caption, height, radius = 14 }: { caption: string; height?: number; radius?: number }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        height,
        aspectRatio: height ? undefined : 16 / 10,
        borderRadius: radius,
        backgroundColor: c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: alpha(c.isDark ? '#FFFFFF' : '#000000', 0.25) }}>{caption}</Text>
    </View>
  );
}

// ---- Star row ----
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { c } = useTheme();
  return <Text style={{ fontSize: size, color: c.amber }}>{'★'.repeat(Math.round(value))}</Text>;
}

export function Row({ children, style, gap }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, gap ? { gap } : null, style]}>{children}</View>;
}

export { ScrollView };
