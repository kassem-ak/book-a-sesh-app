import React from 'react';
import { useStore } from '../state/store';
import { CircleOverlay } from '../overlays/CircleOverlay';
import { EditProfileOverlay } from '../overlays/EditProfileOverlay';
import { MyCommunitiesOverlay } from '../overlays/MyCommunitiesOverlay';
import { CommunityProfileOverlay } from '../overlays/CommunityProfileOverlay';
import { RegistrationOverlay } from '../overlays/RegistrationOverlay';
import { CoachDayViewOverlay } from '../overlays/CoachDayViewOverlay';
import { PersonOverlay } from '../overlays/PersonOverlay';
import { BookingOverlay } from '../overlays/BookingOverlay';
import { BookingsOverlay } from '../overlays/BookingsOverlay';
import {
  CommunityDetailOverlay,
  EventDetailOverlay,
  CreateEventOverlay,
  StartCommunityOverlay,
  RequestOverlay,
  CommunityEditOverlay,
  EventSuggestionOverlay,
} from '../overlays/CommunityOverlays';
import {
  ConversationOverlay,
  NotificationsOverlay,
  ReportOverlay,
} from '../overlays/UtilityOverlays';
import {
  CoachRequestsOverlay,
  CoachScheduleOverlay,
  CoachPackagesOverlay,
} from '../overlays/CoachOverlays';

export function OverlayRouter({ id }: { id: string }) {
  switch (id) {
    case 'editProfile':
      return <EditProfileOverlay />;
    case 'communityProfile':
      return <CommunityProfileOverlay />;
    case 'circle':
      return <CircleOverlay />;
    case 'myCommunities':
      return <MyCommunitiesOverlay />;
    case 'registration':
    case 'communityRegister':
      // handoff v2 section 9: one shared form for community / venue / shop
      return <RegistrationOverlay />;
    case 'coachDayView':
      return <CoachDayViewOverlay />;
    case 'person':
      return <PersonOverlay />;
    case 'booking':
      return <BookingOverlay />;
    case 'bookings':
      return <BookingsOverlay />;
    case 'community':
      return <CommunityDetailOverlay />;
    case 'event':
      return <EventDetailOverlay />;
    case 'createEvent':
      return <CreateEventOverlay />;
    case 'suggestEvent':
      return <EventSuggestionOverlay />;
    case 'editCommunity':
      return <CommunityEditOverlay />;
    case 'startCommunity':
      return <StartCommunityOverlay />;
    case 'request':
      return <RequestOverlay />;
    case 'conversation':
      return <ConversationOverlay />;
    case 'notifications':
      return <NotificationsOverlay />;
    case 'report':
      return <ReportOverlay />;
    case 'coachRequests':
      return <CoachRequestsOverlay />;
    case 'coachSchedule':
      return <CoachScheduleOverlay />;
    case 'coachPackages':
      return <CoachPackagesOverlay />;
    default:
      return null;
  }
}
