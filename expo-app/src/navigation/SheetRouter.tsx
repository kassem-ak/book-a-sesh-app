import React from 'react';
import { RsvpSheet } from '../overlays/RsvpSheet';
import { MyCommunitiesOverlay } from '../overlays/MyCommunitiesOverlay';

export function SheetRouter({ id }: { id: string }) {
  switch (id) {
    case 'rsvp':
      return <RsvpSheet />;
    case 'myComm':
      return <MyCommunitiesOverlay />;
    default:
      return null;
  }
}
