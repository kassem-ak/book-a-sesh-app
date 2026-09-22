import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sport } from '../lib/profiles';
import { useTheme } from '../theme';
import { Button, Field, Icon, MicroBadge, Row, SectionHeading, VoltButton } from './ui';
import { groupSports, useSports } from './useSports';

// The catalogue lives in a modal, not on the page.
//
// It grows every time an admin approves a request, so any inline treatment --
// a wall of chips, or a list with a "show more" -- pushes the rest of the form
// further away the more successful the app gets.
//
// A modal is also the only place the list can scroll. Inline, this component
// sits inside a ScrollView on both the sign-up gate and the profile editor, and
// a nested vertical ScrollView on React Native fights the parent for the
// gesture. On its own layer it scrolls freely, so there is no preview cap and
// no "show more": search, or scroll.
//
// What stays on the page is only what someone chose, which is as long as they
// made it and no longer.
export function SportsPicker({ selected, onChange, coach = false }: {
  selected: string[]; onChange: (ids: string[]) => void; coach?: boolean;
}) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { sports: loaded, failed: error, retry } = useSports();
  const sports: Sport[] = loaded ?? [];
  const loading = !loaded && !error;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const byId = (id: string) => sports.find((sport) => sport.id === id);
  const groups = groupSports(sports, query);
  const searching = query.trim().length > 0;

  const toggle = (id: string) => onChange(
    selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id],
  );
  const drop = (id: string) => onChange(selected.filter((other) => other !== id));
  const promote = (id: string) => onChange([id, ...selected.filter((other) => other !== id)]);

  const close = () => { setOpen(false); setQuery(''); };

  return (
    <View style={{ gap: 14 }}>
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        {coach ? 'Choose the sports or hobbies you teach.' : 'Choose your sports and hobbies of interest.'} Select as many as you like. The first is your primary choice. You can skip this and edit it later.
      </Text>

      {loading && <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>Loading sports and hobbies…</Text>}
      {error && <>
        <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>Sports and hobbies could not load. You can retry or continue without choosing.</Text>
        {/* Not volt: this sat directly above the screen's own CTA, so the
            recovery action outshouted the thing the screen is for. */}
        <Button label="Try again" icon="refresh-cw" tone="danger"
          accessibilityLabel="Retry loading sports and hobbies" onPress={retry} />
      </>}

      {/* Chosen first, in order, because the order is the meaning: the top one
          is what someone is primarily here for. Reordering is one tap on the
          row itself rather than a separate stack of "make X primary" links. */}
      {selected.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionHeading>Your choices · {selected.length}</SectionHeading>
          <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' }}>
            {selected.map((id, index) => {
              const sport = byId(id);
              const primary = index === 0;
              return (
                <Row key={id} gap={8} style={{ alignItems: 'center', minHeight: 52, paddingLeft: 12, paddingRight: 8,
                  backgroundColor: primary ? c.surface : 'transparent',
                  borderTopWidth: index === 0 ? 0 : 1, borderTopColor: c.line2 }}>
                  <Icon name="star" size={16} color={primary ? c.accent : c.txt3} />
                  <Text numberOfLines={1} style={[t.label, { flex: 1, color: c.txt }]}>{sport ? sport.name : 'Unavailable'}</Text>
                  {primary
                    ? <MicroBadge label="Primary" bg={c.volt} fg={c.ink} />
                    : <Button label="Make primary" icon="star" onPress={() => promote(id)}
                        accessibilityLabel={`Make ${sport ? sport.name : 'this'} primary`} />}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${sport ? sport.name : 'this choice'}`}
                    onPress={() => drop(id)}
                    style={{ minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="x" size={18} color={c.txt3} />
                  </Pressable>
                </Row>
              );
            })}
          </View>
          {selected.length > 1 && (
            <Text style={[t.bodySm, { color: c.txt3 }]}>The starred choice is what people see first on your profile.</Text>
          )}
        </View>
      )}

      {sports.length > 0 && (
        <Pressable accessibilityRole="button"
          accessibilityLabel={selected.length ? 'Add or remove sports and hobbies' : 'Choose sports and hobbies'}
          onPress={() => setOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14,
            borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.surface }}>
          <Icon name="search" size={18} color={c.txt3} />
          <Text numberOfLines={1} style={[t.label, { flex: 1, color: selected.length ? c.txt : c.txt3 }]}>
            {selected.length ? `Add or remove · ${selected.length} chosen` : 'Choose sports and hobbies'}
          </Text>
          <Icon name="chevron-down" size={18} color={c.txt3} />
        </Pressable>
      )}

      {!loading && !error && !sports.length && <Text style={[t.bodySm, { color: c.txt3 }]}>No sports or hobbies are available yet.</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        {/* The backdrop dismisses, which is what every sheet on a phone does.
            Choices are applied as they are tapped, so leaving by any route
            keeps them -- there is no half-finished state to discard. */}
        <Pressable accessibilityRole="button" accessibilityLabel="Close the list"
          onPress={close} style={{ flex: 1, backgroundColor: c.scrim }} />
        <View
          accessibilityViewIsModal
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, top: '12%',
            backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            borderTopWidth: 1, borderColor: c.line, overflow: 'hidden',
          }}
        >
          <View style={{ padding: 18, gap: 12, borderBottomWidth: 1, borderBottomColor: c.line2 }}>
            <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[t.overlayTitle, { fontSize: 20, color: c.txt }]}>Sports and hobbies</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close"
                onPress={close}
                style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Icon name="x" size={20} color={c.txt3} />
              </Pressable>
            </Row>
            <Field value={query} onChange={setQuery} icon="search"
              placeholder="Search sports and hobbies" label="Search sports and hobbies" />
            <Text accessibilityLiveRegion="polite" style={[t.caption, { color: c.txt3 }]}>
              {selected.length
                ? `${selected.length} chosen. Tap to add or remove.`
                : 'Tap as many as you like.'}
            </Text>
          </View>

          {/* Its own layer, so this scrolls without fighting the form behind it
              and the whole catalogue stays reachable however long it grows. */}
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 110, gap: 18 }}
            keyboardShouldPersistTaps="handled">
            {groups.length === 0 && (
              <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>
                {searching ? `Nothing matches “${query.trim()}”.` : 'No sports or hobbies are available yet.'}
              </Text>
            )}
            {groups.map((group) => (
              <View key={group.label} style={{ gap: 8 }}>
                <SectionHeading>{group.label}</SectionHeading>
                <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' }}>
                  {group.items.map((sport, index) => {
                    const checked = selected.includes(sport.id);
                    return (
                      <Pressable key={sport.id} accessibilityRole="checkbox" accessibilityLabel={sport.name}
                        accessibilityState={{ checked }}
                        onPress={() => toggle(sport.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12,
                          backgroundColor: checked ? c.surface : 'transparent',
                          borderTopWidth: index === 0 ? 0 : 1, borderTopColor: c.line2 }}>
                        <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 1,
                          alignItems: 'center', justifyContent: 'center',
                          borderColor: checked ? c.volt : c.line, backgroundColor: checked ? c.volt : 'transparent' }}>
                          {checked && <Icon name="check" size={13} color={c.ink} />}
                        </View>
                        <Text numberOfLines={1} style={[t.label, { flex: 1, color: c.txt }]}>{sport.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: 16, paddingBottom: insets.bottom + 16,
            backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line }}>
            <VoltButton label={selected.length ? `Done · ${selected.length} chosen` : 'Done'} onPress={close} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
