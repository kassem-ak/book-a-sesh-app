package com.spotter.app.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.unit.dp
import com.spotter.app.ui.theme.SpotterTheme

/** 45° repeating stripe cover (profile / community headers), fading to bg at bottom. */
@Composable
fun StripeCover(
    heightDp: Int,
    colorA: Color,
    colorB: Color,
    modifier: Modifier = Modifier,
    band: Float = 11f,
    content: @Composable androidx.compose.foundation.layout.BoxScope.() -> Unit = {},
) {
    val bg = SpotterTheme.colors.bg
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(heightDp.dp)
            .drawBehind {
                val stripe = Brush.linearGradient(
                    colorStops = arrayOf(
                        0f to colorA, 0.5f to colorA, 0.5f to colorB, 1f to colorB,
                    ),
                    start = Offset(0f, 0f),
                    end = Offset(band * 2, band * 2),
                    tileMode = TileMode.Repeated,
                )
                drawRect(stripe)
                // fade to bg toward the bottom
                drawRect(
                    Brush.verticalGradient(
                        colorStops = arrayOf(0.25f to Color.Transparent, 1f to bg),
                        startY = 0f, endY = size.height,
                    ),
                )
            },
        content = content,
    )
}
