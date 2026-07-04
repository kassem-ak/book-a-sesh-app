package com.spotter.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.ui.theme.SpotterTheme

/** Primary CTA — 52dp, volt fill / ink text; gated to a disabled surface style. */
@Composable
fun VoltButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    val c = SpotterTheme.colors
    val shapes = SpotterTheme.shapes
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(shapes.button)
            .background(if (enabled) c.volt else c.surface2)
            .clickable(enabled = enabled) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            color = if (enabled) c.ink else c.txt3,
            style = SpotterTheme.type.overlayTitle.copy(fontSize = 16.sp, fontWeight = FontWeight.W800),
        )
    }
}

/** Uppercase section heading — Archivo 800, 12sp, tertiary, wide tracking. */
@Composable
fun SectionHeading(text: String, modifier: Modifier = Modifier, color: Color? = null) {
    val c = SpotterTheme.colors
    Text(
        text = text.uppercase(),
        style = SpotterTheme.type.sectionHeading,
        color = color ?: c.txt3,
        modifier = modifier,
    )
}

/** Initials-on-tint avatar tile. */
@Composable
fun AvatarTile(
    initials: String,
    tint: Color,
    modifier: Modifier = Modifier,
    size: Int = 54,
    radius: Int = 15,
    fontSize: Int = 18,
) {
    Box(
        modifier = modifier
            .size(size.dp)
            .clip(RoundedCornerShape(radius.dp))
            .background(tint),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initials,
            color = Color(0xFFF2F3F5),
            style = SpotterTheme.type.initials.copy(fontSize = fontSize.sp),
        )
    }
}

/** ★ rating with review count. */
@Composable
fun StarRating(
    rating: Double,
    reviews: Int? = null,
    modifier: Modifier = Modifier,
) {
    val c = SpotterTheme.colors
    Row(verticalAlignment = Alignment.CenterVertically, modifier = modifier) {
        Icon(
            Icons.Rounded.Star,
            contentDescription = null,
            tint = c.amberText,
            modifier = Modifier.size(14.dp),
        )
        Spacer(Modifier.width(4.dp))
        Text(formatRating(rating), style = SpotterTheme.type.labelSm, color = c.txt)
        if (reviews != null) {
            Spacer(Modifier.width(5.dp))
            Text("($reviews)", style = SpotterTheme.type.bodySm, color = c.txt3)
        }
    }
}

private fun formatRating(r: Double): String =
    if (r == r.toLong().toDouble()) "${r.toLong()}.0" else r.toString()

/** Small labelled badge (PARTNER / AD / BOOSTED / PENDING …). */
@Composable
fun MicroBadge(
    text: String,
    bg: Color,
    fg: Color,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        Text(text.uppercase(), style = SpotterTheme.type.microBadge, color = fg)
    }
}

/** Card container: surface bg, 1px line border, 18dp radius. */
@Composable
fun SpotterCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    background: Color? = null,
    borderColor: Color? = null,
    shape: RoundedCornerShape? = null,
    content: @Composable () -> Unit,
) {
    val c = SpotterTheme.colors
    val s = shape ?: SpotterTheme.shapes.card
    var m = modifier
        .clip(s)
        .background(background ?: c.surface)
        .border(1.dp, borderColor ?: c.line, s)
    if (onClick != null) {
        m = m.clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = null,
        ) { onClick() }
    }
    Box(m) { content() }
}
