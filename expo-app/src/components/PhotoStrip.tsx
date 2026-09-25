import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { HoldableItem, SafeItemAction } from './ItemMenu';
import { Icon, Row } from './ui';
import { FormSheet } from './ui';
import { useTheme } from '../theme';

// A community's five pictures, always five slots wide.
//
// The tile size is the row divided by five, measured rather than guessed:
// a percentage cannot account for the gaps between tiles, and `flexGrow` would
// make two pictures twice the size of five. The slot is fixed so the strip
// looks the same on the day it holds one picture and the day it holds five --
// which is the point of a fixed gallery rather than a wrapping grid.

export const STRIP_SLOTS = 5;
const GAP = 8;

export type StripPhoto = {
  id: string;
  url: string;
  caption?: string | null;
};

export function PhotoStrip({ photos, label, onRemove, busy, emptySlots = true }: {
  photos: StripPhoto[];
  /** What these are pictures of, for the screen reader. */
  label: string;
  /** Given only to whoever may edit the gallery. */
  onRemove?: (photo: StripPhoto) => void;
  busy?: boolean;
  /** Draw the unused slots. On a public profile an empty frame is clutter; in
   *  the editor it is the affordance that says five fit. */
  emptySlots?: boolean;
}) {
  const { c, t } = useTheme();
  const [width, setWidth] = useState(0);
  const [viewing, setViewing] = useState<StripPhoto | null>(null);

  // (row - four gaps) / five. Floored so rounding never pushes the fifth tile
  // onto a second line.
  const tile = width > 0 ? Math.floor((width - GAP * (STRIP_SLOTS - 1)) / STRIP_SLOTS) : 0;
  const slots = emptySlots
    ? [...photos, ...Array(Math.max(0, STRIP_SLOTS - photos.length)).fill(null)]
    : photos;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <PhotoViewer photo={viewing} label={label} onClose={() => setViewing(null)} />
      {/* Nothing is drawn until the row has been measured: a tile sized 0 for
          one frame is a visible flicker on every mount. */}
      {tile > 0 && (
        <Row style={{ gap: GAP }}>
          {slots.slice(0, STRIP_SLOTS).map((photo: StripPhoto | null, index) => (
            <View key={photo?.id ?? `empty-${index}`} style={{ width: tile, height: tile }}>
              {photo ? (
                // A fifth of a phone wide leaves no room for a delete target
                // that is not also a mis-tap. Tap opens the picture; hold
                // lists what can be done to it.
                <HoldableItem
                  onPress={() => setViewing(photo)}
                  busy={busy}
                  showMore={false}
                  menuTitle={photo.caption || `Picture ${index + 1}`}
                  menuSubtitle={label}
                  accessibilityLabel={photo.caption ?? `${label}, picture ${index + 1}`}
                  actions={[
                    { key: 'view', label: 'View it full size', icon: 'maximize-2', onPress: () => setViewing(photo) },
                    ...(onRemove ? [{
                      key: 'remove',
                      label: 'Remove it',
                      icon: 'trash-2' as const,
                      destructive: true as const,
                      confirm: {
                        title: 'Remove this picture?',
                        body: 'It comes off the gallery and the file is deleted.',
                        confirmLabel: 'Remove it',
                      },
                      onPress: () => onRemove(photo),
                    }] : []),
                  ] as SafeItemAction[]}
                  style={{
                    width: '100%', height: '100%', borderRadius: 10,
                    overflow: 'hidden', backgroundColor: c.surface2,
                  }}
                >
                  <Image source={{ uri: photo.url }} accessibilityIgnoresInvertColors
                    style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </HoldableItem>
              ) : (
                <View style={{
                  width: '100%', height: '100%', borderRadius: 10,
                  borderWidth: 1, borderStyle: 'dashed', borderColor: c.line,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="image" size={14} color={c.txt3} />
                </View>
              )}
            </View>
          ))}
        </Row>
      )}
      {photos.length === 0 && !emptySlots && (
        <Text style={[t.bodySm, { color: c.txt3 }]}>No pictures yet.</Text>
      )}
    </View>
  );
}

// Full size, in a sheet. A tile a fifth of a phone wide is a thumbnail of
// something somebody wanted people to look at.
function PhotoViewer({ photo, label, onClose }: {
  photo: StripPhoto | null;
  label: string;
  onClose: () => void;
}) {
  const { c, t } = useTheme();
  if (!photo) return null;
  return (
    <FormSheet visible title={photo.caption || label} onClose={onClose}>
      <Image
        source={{ uri: photo.url }}
        accessibilityIgnoresInvertColors
        accessibilityLabel={photo.caption ?? label}
        // `contain`, not `cover`: this is the view that exists so the whole
        // picture can be seen, and cropping it here would defeat the tap.
        resizeMode="contain"
        style={{ width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: c.surface2 }}
      />
      {!!photo.caption && (
        <Text style={[t.bodySm, { color: c.txt2, marginTop: 10 }]}>{photo.caption}</Text>
      )}
    </FormSheet>
  );
}
