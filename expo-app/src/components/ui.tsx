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
import { avatarSize, radii, useTheme } from '../theme';

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
  radius = radii.card,
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
  // v2: card radius 20
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
        borderRadius: radii.button,
        backgroundColor: enabled ? c.volt : c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Android clips shrink-to-fit Text with custom fonts; stretch instead. */}
      <Text
        numberOfLines={1}
        style={[t.overlayTitle, { fontSize: 16, color: enabled ? c.ink : c.txt3, alignSelf: 'stretch', textAlign: 'center' }]}
      >
        {label}
      </Text>
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
// Default is the v2 list tile (58). Store hero = 64, venue = 66 — see
// `avatarSize` in ../theme.
export function Avatar({
  initials,
  size = avatarSize.list,
  radius = radii.avatar,
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
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        // was hardcoded dark-theme values; broke in light theme
        backgroundColor: value ? c.volt : c.mono,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: c.nav,
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
  radius = radii.input,
}: {
  options: SegOption[];
  selected: string;
  onSelect: (k: string) => void;
  fontSize?: number;
  pad?: number;
  /** Container radius. Pass `radii.pill` for the Discover coaches|Partners form. */
  radius?: number;
}) {
  const { c, t } = useTheme();
  const inner = radius >= radii.pill ? radii.pill : Math.max(radius - 4, 0);
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: radius, padding: 4 }}>
      {options.map((o) => {
        const active = o.key === selected;
        return (
          <Pressable
            key={o.key}
            onPress={() => onSelect(o.key)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: pad, borderRadius: inner, backgroundColor: active ? c.volt : 'transparent' }}
          >
            <Text numberOfLines={1} style={[t.label, { fontSize, color: active ? c.ink : c.txt2, alignSelf: 'stretch', textAlign: 'center' }]}>{o.label}</Text>
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
      <Text numberOfLines={1} style={[t.labelSm, { color: active ? c.ink : c.txt2, textAlign: fill ? 'center' : 'auto', alignSelf: fill ? 'stretch' : 'auto' }]}>{label}</Text>
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
  radius = radii.input,
  label,
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
  radius?: number;
  label?: string; // accessible name; falls back to the placeholder
}) {
  const { c, t } = useTheme();
  const [focused, setFocused] = React.useState(false);
  // Board annotation: the leading icon switches to volt (#C6F24E) while typing.
  const iconColor = focused || value.length > 0 ? c.accent : c.txt3;
  return (
    <View style={{ width, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: radius, paddingHorizontal: 14, paddingVertical: 12 }}>
      {icon ? <Icon name={icon} size={17} color={iconColor} /> : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.txt3}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        accessibilityLabel={label ?? placeholder}
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
        // `--ph` token — was surface2 + a hardcoded alpha caption
        backgroundColor: c.ph,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <View style={{ borderRadius: 6, borderWidth: 1, borderColor: c.line, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontFamily: 'monospace', fontSize: 10, color: c.txt3 }}>{caption}</Text>
      </View>
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
