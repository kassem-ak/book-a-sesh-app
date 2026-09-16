import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { dark, light } from '../theme/colors';

/**
 * Catches render-time crashes.
 *
 * Without this, any throw inside a screen unmounts the whole tree and the user
 * is left staring at a blank screen with no way back and no signal that
 * anything went wrong. `ErrorBanner` does not help here: it only surfaces
 * `writeError` from store writes, never a render failure.
 *
 * Deliberately not themed through `useTheme()` — the crash may have come from
 * the theme or store itself, so this reads the palette directly and holds no
 * state beyond the error.
 */
type Props = { children: React.ReactNode; isDark: boolean };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // No crash reporter is wired up yet. Logging at least puts the stack in
    // `adb logcat` / the browser console instead of losing it entirely.
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const c = this.props.isDark ? dark : light;
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center' }}>
        <Text
          accessibilityRole="header"
          style={{ color: c.txt, fontSize: 22, fontWeight: '700', marginBottom: 10 }}
        >
          Something broke
        </Text>
        <Text style={{ color: c.txt2, fontSize: 15, lineHeight: 21, marginBottom: 18 }}>
          Sorry, this screen hit an error. Please try again. Any unsaved changes
          may need to be entered again.
        </Text>

        <ScrollView style={{ maxHeight: 160, marginBottom: 20 }}>
          <Text selectable style={{ color: c.txt3, fontSize: 12, fontFamily: 'monospace' }}>
            {error.message || String(error)}
          </Text>
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => this.setState({ error: null })}
          style={{
            height: 52,
            borderRadius: 15,
            backgroundColor: c.volt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: c.ink, fontSize: 16, fontWeight: '700' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
