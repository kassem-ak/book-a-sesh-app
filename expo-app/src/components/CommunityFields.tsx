import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SocialFields } from './SocialLinks';
import { Icon, Row, SectionHeading, Segmented } from './ui';
import { SportsPicker } from './SportsPicker';
import { ChatMode, CHAT_MODES, CommunityPrivacy } from '../lib/communities';
import { NO_SOCIALS, SocialHandles, socialsDiffer } from '../lib/socialLinks';
import { alpha, radii, useTheme } from '../theme';

// Everything a community is, on one form.
//
// Shared deliberately between creating one and editing one. It used to exist
// only in the settings screen, so starting a community asked for a name and
// nothing else -- you made the thing, then went and found the settings to say
// what sport it was about, who could join, and what it was for. The form is the
// same either way now, so the two cannot drift and creation cannot be the
// poorer of the two.
//
// The picture and the gallery are NOT here. Both upload into storage under the
// community's own uuid and the bucket policy checks you administer that
// community, so neither can be attached before the row exists. They stay in the
// settings screen, which is where the create flow lands afterwards.

export type CommunityDraft = {
  name: string;
  about: string;
  privacy: CommunityPrivacy;
  sportId: string | null;
  chatMode: ChatMode;
  socials: SocialHandles;
};

export const EMPTY_COMMUNITY_DRAFT: CommunityDraft = {
  name: '',
  about: '',
  privacy: 'open',
  sportId: null,
  chatMode: 'chatroom',
  socials: NO_SOCIALS,
};

/** True when two drafts differ, field by field. Socials are compared by hand
 *  because they are a nested object and a new object every render. */
export function draftDiffers(a: CommunityDraft, b: CommunityDraft): boolean {
  return a.name !== b.name
    || a.about !== b.about
    || a.privacy !== b.privacy
    || a.sportId !== b.sportId
    || a.chatMode !== b.chatMode
    || socialsDiffer(a.socials, b.socials);
}

export function CommunityFields({ value, onChange, busy = false }: {
  value: CommunityDraft;
  onChange: (next: CommunityDraft) => void;
  busy?: boolean;
}) {
  const { c, t } = useTheme();
  const set = <K extends keyof CommunityDraft>(key: K, next: CommunityDraft[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <>
      <SectionHeading style={{ marginTop: 8 }}>Name</SectionHeading>
      <TextInput
        value={value.name} onChangeText={(next) => set('name', next)} editable={!busy}
        placeholder="What this community is called" placeholderTextColor={c.txt3}
        accessibilityLabel="Community name"
        style={[t.body, {
          color: c.txt, backgroundColor: c.surface, minHeight: 48,
          borderColor: c.line, borderWidth: 1, borderRadius: radii.input, paddingHorizontal: 14,
        }]}
      />

      <SectionHeading style={{ marginTop: 8 }}>Description</SectionHeading>
      <TextInput
        value={value.about} onChangeText={(next) => set('about', next)} multiline editable={!busy}
        placeholder="What members should know before they join"
        placeholderTextColor={c.txt3} textAlignVertical="top"
        accessibilityLabel="Community description"
        style={[t.body, {
          color: c.txt, backgroundColor: c.surface, minHeight: 100,
          borderColor: c.line, borderWidth: 1, borderRadius: radii.input, padding: 14,
        }]}
      />

      {/* ---- The sport it is about ---- */}
      <SectionHeading style={{ marginTop: 8 }}>Sport or hobby</SectionHeading>
      {/* The same search every other picker uses, one choice. A wall of chips
          was fine at fifteen entries and gets worse with every request an admin
          approves; the search does not. And a crew about something not yet
          listed can ask for it from here without leaving the form. */}
      <SportsPicker
        single
        selected={value.sportId ? [value.sportId] : []}
        onChange={(ids) => set('sportId', ids[0] ?? null)}
        intro="One, so people looking for it can find it. This is what the community is about, not everything its members do."
      />

      {/* ---- Who may walk in ---- */}
      <SectionHeading style={{ marginTop: 8 }}>Who can join</SectionHeading>
      <Segmented
        options={[
          { key: 'open', label: 'Open' },
          { key: 'closed', label: 'Closed' },
        ]}
        selected={value.privacy}
        onSelect={(key) => set('privacy', key as CommunityPrivacy)}
      />
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        {value.privacy === 'open'
          ? 'Anyone can join without asking.'
          : 'People ask to join, and an admin or moderator answers. Everyone already in stays in.'}
      </Text>

      {/* ---- The community's thread ---- */}
      <SectionHeading style={{ marginTop: 8 }}>Community chat</SectionHeading>
      <View style={{ gap: 8 }}>
        {CHAT_MODES.map((option) => {
          const on = value.chatMode === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => set('chatMode', option.key)}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${option.label}. ${option.blurb}`}
              style={{
                minHeight: 48, padding: 12, borderRadius: radii.input, borderWidth: 1,
                borderColor: on ? c.volt : c.line,
                backgroundColor: on ? alpha(c.volt, 0.1) : c.surface,
              }}
            >
              <Row gap={8} style={{ alignItems: 'center' }}>
                <Icon name={on ? 'check-circle' : 'circle'} size={16} color={on ? c.accent : c.txt3} />
                <Text style={[t.labelSm, { color: on ? c.accent : c.txt }]}>{option.label}</Text>
              </Row>
              <Text style={[t.caption, { color: c.txt2, marginTop: 4, marginLeft: 24 }]}>
                {option.blurb}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeading style={{ marginTop: 8 }}>Find us on</SectionHeading>
      <SocialFields
        value={value.socials} disabled={busy} subject="this community's"
        onChange={(next) => set('socials', next)}
      />
    </>
  );
}
