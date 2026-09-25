import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from './Overlay';
import { Avatar, Button, Field, Row } from './ui';
import { initials } from '../state/models';
import { errorMessage, useStore } from '../state/store';
import { useTheme } from '../theme';

// Pick somebody on the app.
//
// Shared because two features need the same thing and would otherwise grow two
// slightly different lists: inviting to an event, and suggesting a community.
// The names come from the people already loaded for Discover -- a separate
// directory read would be a second answer to "who exists".

export function PersonPicker({
  visible, title, subtitle, actionLabel, exclude = [], onPick, onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** The verb on each row: "Invite", "Suggest". */
  actionLabel: string;
  /** Ids already handled, so nobody is offered twice. */
  exclude?: string[];
  /** Throw to show the message against that row. */
  onPick: (userId: string, name: string) => Promise<void>;
  onClose: () => void;
}) {
  const { c, t } = useTheme();
  const s = useStore();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  if (!visible) return null;

  const needle = query.trim().toLowerCase();
  const people = s.people()
    .filter((person) => !exclude.includes(person.id) && !done.includes(person.id))
    .filter((person) => !needle || person.name.toLowerCase().includes(needle))
    // Enough to scroll, few enough that the list stays a list. Searching is
    // the way to reach somebody further down.
    .slice(0, 30);

  const pick = (userId: string, name: string) => void (async () => {
    setBusy(userId);
    setError(null);
    try {
      await onPick(userId, name);
      // Kept open on purpose: sending one invitation usually means sending
      // three. The row disappears so it cannot be sent twice.
      setDone((already) => [...already, userId]);
    } catch (e) {
      setError(`${name}: ${errorMessage(e)}`);
    } finally { setBusy(null); }
  })();

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: c.bg, zIndex: 20,
    }}>
      <OverlayScaffold header={<OverlayHeader title={title} subtitle={subtitle} onBack={onClose} />}>
        <View style={{ paddingHorizontal: 18, gap: 12 }}>
          {error && <Text accessibilityRole="alert" style={[t.bodySm, { color: c.danger }]}>{error}</Text>}
          {done.length > 0 && (
            <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.accent }]}>
              Sent to {done.length} {done.length === 1 ? 'person' : 'people'}.
            </Text>
          )}
          <Field value={query} onChange={setQuery} placeholder="Search by name" icon="search"
            label="Search people" />
          {people.length === 0 && (
            <Text style={[t.bodySm, { color: c.txt3 }]}>
              {needle ? 'Nobody by that name.' : 'There is nobody left to send this to.'}
            </Text>
          )}
          {people.map((person) => (
            <Row key={person.id} gap={10} style={{ alignItems: 'center' }}>
              <Avatar initials={initials(person.name)} avatarUrl={person.avatarUrl} size={38} fontSize={14} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[t.name, { color: c.txt }]}>{person.name}</Text>
                <Text numberOfLines={1} style={[t.caption, { color: c.txt3 }]}>{person.sport}</Text>
              </View>
              <Button
                label={actionLabel}
                icon="send"
                enabled={busy !== person.id}
                busy={busy === person.id}
                busyLabel="Sending…"
                accessibilityLabel={`${actionLabel} ${person.name}`}
                onPress={() => pick(person.id, person.name)}
              />
            </Row>
          ))}
        </View>
      </OverlayScaffold>
    </View>
  );
}
