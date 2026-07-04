package com.spotter.app.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.spotter.app.ui.theme.SpotterTheme

/** Temporary placeholder used until a screen/overlay is implemented. */
@Composable
fun ScreenPlaceholder(title: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(title, color = SpotterTheme.colors.txt2, style = SpotterTheme.type.overlayTitle)
    }
}
