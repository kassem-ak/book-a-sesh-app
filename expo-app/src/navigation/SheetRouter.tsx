import React from 'react';
import { Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { RsvpSheet } from '../overlays/RsvpSheet';
import { MyCommunitiesOverlay } from '../overlays/MyCommunitiesOverlay';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

// Handoff v2 second presentation layer. Overlays are full screen; sheets slide
// up from the bottom over a scrim. Ids: rsvp | story | hours | pkg | myComm | admin
export function SheetRouter({ id }: { id: string }) {
  const { c, t } = useTheme();
  const closeSheet = useStore((s) => s.closeSheet);

  switch (id) {
    case 'rsvp':
      return <RsvpSheet />;
    case 'myComm':
      return <MyCommunitiesOverlay />;
    case 'story':
      return (
        <Sheet title="Add to gallery" onClose={closeSheet}>
          <Text style={[t.bodySm, { color: c.txt2 }]}>
            Pick a photo to add to this venue&apos;s story. Photo picking is not wired up yet.
          </Text>
          <View style={{ height: 8 }} />
        </Sheet>
      );
    default:
      return null;
  }
}
