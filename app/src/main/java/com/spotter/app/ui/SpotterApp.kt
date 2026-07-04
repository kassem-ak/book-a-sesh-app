package com.spotter.app.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.nav.SpotterBottomNav
import com.spotter.app.ui.screens.ChatScreen
import com.spotter.app.ui.screens.CommunityScreen
import com.spotter.app.ui.screens.DiscoverScreen
import com.spotter.app.ui.screens.ProfileScreen
import com.spotter.app.ui.screens.ShopScreen
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun SpotterApp(vm: SpotterViewModel = viewModel()) {
    val c = SpotterTheme.colors
    val slidePx = with(LocalDensity.current) { 14.dp.roundToPx() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(c.bg),
    ) {
        // ---- main tabbed app ----
        Column(Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .windowInsetsPadding(WindowInsets.statusBars),
            ) {
                when (vm.tab) {
                    "discover" -> DiscoverScreen(vm)
                    "community" -> CommunityScreen(vm)
                    "shop" -> ShopScreen(vm)
                    "chat" -> ChatScreen(vm)
                    "profile" -> ProfileScreen(vm)
                }
            }
            SpotterBottomNav(selected = vm.tab, onSelect = { vm.tab = it })
        }

        // ---- overlay host (slide-up 14dp + fade, 280ms) ----
        AnimatedContent(
            targetState = vm.overlay,
            transitionSpec = {
                (slideInVertically(tween(280)) { slidePx } + fadeIn(tween(280)))
                    .togetherWith(fadeOut(tween(120)))
            },
            label = "overlay",
        ) { ov ->
            if (ov != null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(c.bg)
                        .windowInsetsPadding(WindowInsets.statusBars),
                ) {
                    OverlayRouter(vm, ov)
                }
            }
        }
    }
}
