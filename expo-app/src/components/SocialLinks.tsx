import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Icon, IconName, Row } from './ui';
import {
  handleProblem, normaliseHandle, SOCIAL_PLATFORMS, SocialHandles, socialUrl,
} from '../lib/socialLinks';
import { radii, useTheme } from '../theme';

// Somebody's social accounts, on a profile and in the editor.
//
// Both live here because they are one idea seen twice, and the pair that
// matters is "what the reader taps" and "what the owner types". Splitting them
// across two files is how the label on one drifts from the label on the other.

/** The row of accounts on a profile. Renders nothing when there are none --
 *  an empty "Find me on" heading is worse than no heading. */
export function SocialRow({ handles, name }: { handles: SocialHandles; name: string }) {
  const { c, t } = useTheme();
  const shown = SOCIAL_PLATFORMS
    .map((platform) => ({ ...platform, handle: handles[platform.key] }))
    .filter((platform) => platform.handle);
  if (!shown.length) return null;

  const open = (url: string) => {
    // A new tab on the web: openBrowserAsync navigates the page itself, which
    // would unmount the app behind it. Same reasoning as the certificate
    // viewer.
    if (Platform.OS === 'web') window.open(url, '_blank', 'noopener,noreferrer');
    else void WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  return (
    <Row gap={8} style={{ flexWrap: 'wrap' }}>
      {shown.map((platform) => (
        <Pressable
          key={platform.key}
          onPress={() => open(socialUrl(platform.key, platform.handle!))}
          accessibilityRole="link"
          accessibilityLabel={`${name} on ${platform.label}, ${platform.handle}`}
          accessibilityHint="Opens in your browser"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 7,
            minHeight: 40, paddingHorizontal: 12,
            borderRadius: radii.input, borderWidth: 1, borderColor: c.line,
            backgroundColor: c.surface,
          }}
        >
          <Icon name={platform.icon as IconName} size={15} color={c.txt2} />
          <Text numberOfLines={1} style={[t.bodySm, { color: c.txt2, maxWidth: 140 }]}>
            {platform.prefix}{platform.handle}
          </Text>
        </Pressable>
      ))}
    </Row>
  );
}

/** The three fields, for whoever owns the profile.
 *
 *  Validated as you type rather than on save: the rule is one line long and a
 *  person who pasted a URL should find out before they have filled in the
 *  other two. The value handed back is already normalised, so what the field
 *  shows and what the database gets are the same string. */
// One handle field.
//
// It keeps what is being typed and only reduces it to a handle when the field
// is left. Normalising on every keystroke looks tidy and cannot work: the
// reducer takes the last path segment of anything URL-shaped, so typing a link
// by hand rewrites the field under the cursor after the second slash --
// "https://instagram.com/name" becomes "https:instagram.comname", one character
// at a time. Only pasting ever survived, while the label above promises that
// typing a link works too.
function HandleInput({ value, disabled, invalid, placeholder, label, onCommit }: {
  value: string;
  disabled?: boolean;
  invalid: boolean;
  placeholder: string;
  label: string;
  onCommit: (handle: string) => void;
}) {
  const { c, t } = useTheme();
  const [text, setText] = useState(value);
  // The saved value wins whenever it changes underneath -- loading a community,
  // or the commit below rewriting a pasted URL into a handle.
  useEffect(() => { setText(value); }, [value]);

  const commit = () => {
    const handle = normaliseHandle(text) ?? '';
    setText(handle);
    if (handle !== value) onCommit(handle);
  };

  return (
    <TextInput
      value={text}
      editable={!disabled}
      autoCapitalize="none"
      autoCorrect={false}
      onChangeText={setText}
      // Leaving the field is when a pasted URL collapses to a handle, in front
      // of the person who pasted it rather than silently at save time.
      onBlur={commit}
      onSubmitEditing={commit}
      placeholder={placeholder}
      placeholderTextColor={c.txt3}
      accessibilityLabel={label}
      style={[t.body, {
        color: c.txt, backgroundColor: c.surface, minHeight: 48,
        borderColor: invalid ? c.danger : c.line, borderWidth: 1,
        borderRadius: radii.input, paddingHorizontal: 14,
      }]}
    />
  );
}

export function SocialFields({ value, onChange, disabled, subject }: {
  value: SocialHandles;
  onChange: (next: SocialHandles) => void;
  disabled?: boolean;
  /** "your" for a person, "this community's" for a community. */
  subject?: string;
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={[t.bodySm, { color: c.txt2 }]}>
        Paste a link or type the username — either works. Anyone who can see{' '}
        {subject ?? 'your'} profile can see these.
      </Text>
      {SOCIAL_PLATFORMS.map((platform) => {
        const current = value[platform.key] ?? '';
        const problem = handleProblem(current || null);
        return (
          <View key={platform.key} style={{ gap: 6 }}>
            <Row gap={7} style={{ alignItems: 'center' }}>
              <Icon name={platform.icon as IconName} size={14} color={c.txt3} />
              <Text style={[t.caption, { color: c.txt3 }]}>{platform.label}</Text>
            </Row>
            <HandleInput
              value={current}
              disabled={disabled}
              invalid={!!problem}
              placeholder={platform.prefix + platform.hint}
              label={`${platform.label} username`}
              onCommit={(handle) => onChange({ ...value, [platform.key]: handle })}
            />
            {problem && (
              <Text accessibilityRole="alert" style={[t.caption, { color: c.danger }]}>
                {problem}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
