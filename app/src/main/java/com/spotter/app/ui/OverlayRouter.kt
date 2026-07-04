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
import com.spotter.app.ui.overlays.BookingOverlay
import com.spotter.app.ui.overlays.BookingsOverlay
import com.spotter.app.ui.overlays.PersonOverlay
import com.spotter.app.ui.theme.SpotterTheme

/**
 * Routes a non-null overlay id to its content. Overlays are filled in per task;
 * unimplemented ids fall back to a titled placeholder.
 */
@Composable
fun OverlayRouter(vm: SpotterViewModel, overlayId: String) {
    when (overlayId) {
        "person" -> PersonOverlay(vm)
        "booking" -> BookingOverlay(vm)
        "bookings" -> BookingsOverlay(vm)
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
