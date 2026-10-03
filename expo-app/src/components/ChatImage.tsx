import React, { useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { Icon } from './ui';
import { useTheme } from '../theme';

// A picture inside a chat bubble, and the full-size view behind a tap.
//
// Square and fixed in size in the bubble, so a thread of portrait and landscape
// photos does not jump about as each one loads. The whole picture is a tap
// away.
//
// A message whose picture can no longer be opened -- removed, or the link has
// expired and the thread has not been reopened -- says so in place rather than
// leaving an empty frame that looks like it is still loading.

const SIDE = 200;

export function ChatImage({ url, hasImage, label }: { url: string | null; hasImage: boolean; label: string }) {
  const { c, t } = useTheme();
  const [open, setOpen] = useState(false);
  if (!hasImage) return null;
  if (!url) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
        <Icon name="image" size={14} color={c.txt3} />
        <Text style={[t.caption, { color: c.txt3 }]}>Photo no longer available</Text>
      </View>
    );
  }
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton" accessibilityLabel={`${label}. Open it full size`}>
        <Image source={{ uri: url }} style={{ width: SIDE, height: SIDE, borderRadius: 12, backgroundColor: c.surface2 }} resizeMode="cover" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close the photo"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Image source={{ uri: url }} style={{ width: '94%', height: '80%' }} resizeMode="contain" accessibilityLabel={label} />
          <View style={{ position: 'absolute', top: 48, right: 24 }}>
            <Icon name="x" size={26} color="#FFFFFF" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/** The picture waiting to be sent, above the composer, with a way to drop it. */
export function PendingImage({ uri, onRemove }: { uri: string; onRemove: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
      <View style={{ width: 72, height: 72 }}>
        <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: c.surface2 }} />
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Remove the photo"
          hitSlop={10}
          style={{
            position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: 13,
            backgroundColor: c.bg, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="x" size={14} color={c.txt} />
        </Pressable>
      </View>
    </View>
  );
}
