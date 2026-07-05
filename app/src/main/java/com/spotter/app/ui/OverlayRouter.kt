package com.spotter.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.OverlayHeader
import com.spotter.app.ui.components.OverlayScaffold
import com.spotter.app.ui.overlays.AccountingExpenseOverlay
import com.spotter.app.ui.overlays.AccountingHistoryOverlay
import com.spotter.app.ui.overlays.AdminAccountingOverlay
import com.spotter.app.ui.overlays.AdminApprovalsOverlay
import com.spotter.app.ui.overlays.AdminCaseOverlay
import com.spotter.app.ui.overlays.AdminLoyaltyOverlay
import com.spotter.app.ui.overlays.AdminPromosOverlay
import com.spotter.app.ui.overlays.AdminReportsOverlay
import com.spotter.app.ui.overlays.BookingOverlay
import com.spotter.app.ui.overlays.BookingsOverlay
import com.spotter.app.ui.overlays.CoachPackagesOverlay
import com.spotter.app.ui.overlays.CoachRequestsOverlay
import com.spotter.app.ui.overlays.CoachScheduleOverlay
import com.spotter.app.ui.overlays.CommunityDetailOverlay
import com.spotter.app.ui.overlays.ConversationOverlay
import com.spotter.app.ui.overlays.CreateEventOverlay
import com.spotter.app.ui.overlays.EventDetailOverlay
import com.spotter.app.ui.overlays.NotificationsOverlay
import com.spotter.app.ui.overlays.PersonOverlay
import com.spotter.app.ui.overlays.ReportOverlay
import com.spotter.app.ui.overlays.RequestOverlay
import com.spotter.app.ui.overlays.SafetyCaseOverlay
import com.spotter.app.ui.overlays.ShopRegisterOverlay
import com.spotter.app.ui.overlays.ShopStorefrontOverlay
import com.spotter.app.ui.overlays.StartCommunityOverlay
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun OverlayRouter(vm: SpotterViewModel, overlayId: String) {
    when (overlayId) {
        "person" -> PersonOverlay(vm)
        "booking" -> BookingOverlay(vm)
        "bookings" -> BookingsOverlay(vm)
        "shop" -> ShopStorefrontOverlay(vm)
        "shopRegister" -> ShopRegisterOverlay(vm)
        "community" -> CommunityDetailOverlay(vm)
        "event" -> EventDetailOverlay(vm)
        "createEvent" -> CreateEventOverlay(vm)
        "startCommunity" -> StartCommunityOverlay(vm)
        "request" -> RequestOverlay(vm)
        "conversation" -> ConversationOverlay(vm)
        "notifications" -> NotificationsOverlay(vm)
        "coachRequests" -> CoachRequestsOverlay(vm)
        "coachSchedule" -> CoachScheduleOverlay(vm)
        "coachPackages" -> CoachPackagesOverlay(vm)
        "adminApprovals" -> AdminApprovalsOverlay(vm)
        "adminReports" -> AdminReportsOverlay(vm)
        "adminCase" -> AdminCaseOverlay(vm)
        "safetyCase" -> SafetyCaseOverlay(vm)
        "adminPromos" -> AdminPromosOverlay(vm)
        "adminLoyalty" -> AdminLoyaltyOverlay(vm)
        "adminAccounting" -> AdminAccountingOverlay(vm)
        "acctExpense" -> AccountingExpenseOverlay(vm)
        "acctHistory" -> AccountingHistoryOverlay(vm)
        "report" -> ReportOverlay(vm)
        else -> OverlayScaffold(
            header = { OverlayHeader(title = overlayId, onBack = vm::closeOverlay) },
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    "Overlay: $overlayId",
                    color = SpotterTheme.colors.txt3,
                    style = SpotterTheme.type.body,
                )
            }
        }
    }
}
