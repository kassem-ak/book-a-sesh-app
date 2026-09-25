import React, { useState } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Button, ConfirmSheet, FormSheet, Icon, IconName } from './ui';

// The Material floor, and the one the rest of this app settled on. Declared
// here because ui.tsx does not export it.
const TAP = 48;
import { alpha, radii, useTheme } from '../theme';

// Press and hold an item to get everything you can do to it.
//
// This replaces the trash cans. A delete button sitting on a card is a
// mine: it is the smallest target on the row, it is one mis-tap from
// destroying something, and it crowds out every other action the item has.
// Holding the item instead opens a list of what is possible, with the
// destructive entry last and tinted.
//
// Two rules this component enforces so no call site can forget them:
//
//   1. A long press is invisible and unreachable by a screen reader, so every
//      menu also has a visible "More" affordance and an accessibilityAction.
//      Hold-to-open is the shortcut, never the only way in.
//   2. A `destructive` action ALWAYS goes through a confirmation. The caller
//      supplies the words; it cannot supply "no confirmation".

export type ItemAction = {
  key: string;
  label: string;
  icon: IconName;
  /** Destructive, withdrawing, or socially significant: delete, leave,
   *  unfollow, block, remove, cancel. Tinted, sorted last, and always
   *  confirmed. */
  destructive?: boolean;
  /** Shown instead of the action when it cannot be taken, e.g. "Only the
   *  owner can delete this". Renders the row dimmed and unpressable. */
  disabledReason?: string;
  /** What the confirmation says. Required for a destructive action --
   *  the type below makes that a compile error rather than a code review. */
  confirm?: { title: string; body: string; confirmLabel: string };
  onPress: () => void;
};

/** A destructive action must carry its confirmation. */
export type SafeItemAction =
  | (ItemAction & { destructive?: false })
  | (ItemAction & { destructive: true; confirm: NonNullable<ItemAction['confirm']> });

export function ItemMenu({
  actions, title, subtitle, visible, onClose, busy,
}: {
  actions: SafeItemAction[];
  title: string;
  subtitle?: string;
  visible: boolean;
  onClose: () => void;
  busy?: boolean;
}) {
  const { c, t } = useTheme();
  const [confirming, setConfirming] = useState<SafeItemAction | null>(null);

  // Destructive last, always. Somebody reaching for "Edit" should never find
  // "Delete" where their thumb already was.
  const ordered = [...actions].sort((a, b) => Number(!!a.destructive) - Number(!!b.destructive));

  const choose = (action: SafeItemAction) => {
    if (action.disabledReason) return;
    if (action.destructive) { setConfirming(action); return; }
    onClose();
    action.onPress();
  };

  return (
    <>
      <FormSheet visible={visible && !confirming} title={title} subtitle={subtitle} onClose={onClose}>
        <View style={{ gap: 6 }}>
          {ordered.map((action) => {
            const off = !!action.disabledReason || !!busy;
            return (
              <View key={action.key}>
                <Pressable
                  onPress={() => choose(action)}
                  disabled={off}
                  accessibilityRole="menuitem"
                  accessibilityState={{ disabled: off }}
                  accessibilityLabel={action.label}
                  accessibilityHint={action.disabledReason}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    minHeight: TAP, paddingHorizontal: 14, borderRadius: radii.input,
                    opacity: off ? 0.45 : 1,
                    backgroundColor: pressed ? alpha(c.volt, 0.1) : 'transparent',
                  })}
                >
                  <Icon
                    name={action.icon}
                    size={18}
                    color={action.destructive ? c.danger : c.txt2}
                  />
                  <Text style={[t.body, { color: action.destructive ? c.danger : c.txt, flex: 1 }]}>
                    {action.label}
                  </Text>
                </Pressable>
                {!!action.disabledReason && (
                  <Text style={[t.caption, { color: c.txt3, marginLeft: 44, marginBottom: 4 }]}>
                    {action.disabledReason}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </FormSheet>

      <ConfirmSheet
        visible={!!confirming}
        title={confirming?.confirm?.title ?? ''}
        body={confirming?.confirm?.body ?? ''}
        confirmLabel={confirming?.confirm?.confirmLabel ?? 'Yes'}
        confirmIcon={confirming?.icon}
        busy={!!busy}
        onConfirm={() => {
          const action = confirming;
          setConfirming(null);
          onClose();
          action?.onPress();
        }}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}

/** An item you can hold.
 *
 *  Wraps the row or tile. A normal press does whatever the item does; a long
 *  press — or the "More" button, or the screen reader's own menu action —
 *  opens the list. */
export function HoldableItem({
  children, actions, menuTitle, menuSubtitle, onPress, accessibilityLabel,
  style, busy, showMore = true,
}: {
  children: React.ReactNode;
  actions: SafeItemAction[];
  menuTitle: string;
  menuSubtitle?: string;
  onPress?: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  busy?: boolean;
  /** The visible dots. Off only where the container draws its own. */
  showMore?: boolean;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  if (!actions.length) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={style}>
      <Pressable
        onPress={onPress}
        onLongPress={() => setOpen(true)}
        // Long enough not to fire while somebody is scrolling with a finger
        // resting on a card, short enough to feel deliberate.
        delayLongPress={350}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Hold for more options"
        // The screen reader's rotor reaches this; a long press does not.
        accessibilityActions={[{ name: 'longpress', label: 'More options' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'longpress') setOpen(true);
        }}
      >
        {children}
      </Pressable>

      {showMore && (
        <Pressable
          onPress={() => setOpen(true)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${accessibilityLabel}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: 'absolute', top: 4, right: 4,
            width: 36, height: 36, borderRadius: 18,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="more-horizontal" size={18} color={c.txt3} />
        </Pressable>
      )}

      <ItemMenu
        actions={actions}
        title={menuTitle}
        subtitle={menuSubtitle}
        visible={open}
        busy={busy}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

/** For a single action that is not worth a menu but still must be confirmed --
 *  "Leave" on a community card, "Unfollow" on a profile.
 *
 *  Exists so that a call site cannot render a bare destructive Button: the
 *  confirmation is part of the component, not something to remember. */
export function ConfirmButton({
  label, icon, confirm, onPress, busy, busyLabel, full, tone = 'danger', enabled = true, style,
}: {
  label: string;
  icon: IconName;
  confirm: { title: string; body: string; confirmLabel: string };
  onPress: () => void;
  busy?: boolean;
  busyLabel?: string;
  full?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Button
        label={label}
        icon={icon}
        tone={tone}
        full={full}
        busy={busy}
        busyLabel={busyLabel}
        enabled={enabled && !busy}
        style={style}
        accessibilityLabel={label}
        onPress={() => setAsking(true)}
      />
      <ConfirmSheet
        visible={asking}
        title={confirm.title}
        body={confirm.body}
        confirmLabel={confirm.confirmLabel}
        confirmIcon={icon}
        busy={!!busy}
        onConfirm={() => { setAsking(false); onPress(); }}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}

/** The same guarantee for an icon-only control that has no room for a label. */
export function ConfirmIconButton({
  icon, accessibilityLabel, confirm, onPress, busy, size = 17, color,
}: {
  icon: IconName;
  accessibilityLabel: string;
  confirm: { title: string; body: string; confirmLabel: string };
  onPress: () => void;
  busy?: boolean;
  size?: number;
  color?: string;
}) {
  const { c } = useTheme();
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setAsking(true)}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ minHeight: TAP, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={icon} size={size} color={color ?? c.txt3} />
      </Pressable>
      <ConfirmSheet
        visible={asking}
        title={confirm.title}
        body={confirm.body}
        confirmLabel={confirm.confirmLabel}
        confirmIcon={icon}
        busy={!!busy}
        onConfirm={() => { setAsking(false); onPress(); }}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
