import React from 'react';
import { useStore } from '../state/store';
import { AuthOverlay } from '../overlays/AuthOverlay';
import { MyCommunitiesOverlay } from '../overlays/MyCommunitiesOverlay';
import { CommunityProfileOverlay } from '../overlays/CommunityProfileOverlay';
import { RegistrationOverlay } from '../overlays/RegistrationOverlay';
import { CoachDayViewOverlay } from '../overlays/CoachDayViewOverlay';
import { PersonOverlay } from '../overlays/PersonOverlay';
import { BookingOverlay } from '../overlays/BookingOverlay';
import { BookingsOverlay } from '../overlays/BookingsOverlay';
import { ShopStorefrontOverlay, ShopRegisterOverlay } from '../overlays/ShopOverlays';
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
import { AdminApprovalsOverlay } from '../overlays/AdminApprovalsOverlay';
import {
  AdminReportsOverlay,
  AdminCaseOverlay,
  SafetyCaseOverlay,
  AdminPromosOverlay,
  AdminLoyaltyOverlay,
} from '../overlays/AdminOverlays';
import {
  AdminAccountingOverlay,
  AccountingExpenseOverlay,
  AccountingHistoryOverlay,
} from '../overlays/AccountingOverlays';
import {
  CoachRequestsOverlay,
  CoachScheduleOverlay,
  CoachPackagesOverlay,
} from '../overlays/CoachOverlays';

export function OverlayRouter({ id }: { id: string }) {
  switch (id) {
    case 'auth':
      return <AuthOverlay />;
    case 'communityProfile':
      return <CommunityProfileOverlay />;
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
    case 'shop':
      return <ShopStorefrontOverlay />;
    case 'shopRegister':
      return <ShopRegisterOverlay />;
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
    case 'adminApprovals':
      return <AdminApprovalsOverlay />;
    case 'adminReports':
      return <AdminReportsOverlay />;
    case 'adminCase':
      return <AdminCaseOverlay />;
    case 'safetyCase':
      return <SafetyCaseOverlay />;
    case 'adminPromos':
      return <AdminPromosOverlay />;
    case 'adminLoyalty':
      return <AdminLoyaltyOverlay />;
    case 'adminAccounting':
      return <AdminAccountingOverlay />;
    case 'acctExpense':
      return <AccountingExpenseOverlay />;
    case 'acctHistory':
      return <AccountingHistoryOverlay />;
    default:
      return null;
  }
}
