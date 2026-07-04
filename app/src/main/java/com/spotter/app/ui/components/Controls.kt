package com.spotter.app.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.ui.theme.SpotterTheme

/** 46×26 track toggle; volt on, muted off, 20dp knob, 200ms slide. */
@Composable
fun SpotterToggle(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = SpotterTheme.colors
    val knobOffset by animateDpAsState(
        targetValue = if (checked) 22.dp else 2.dp,
        animationSpec = tween(200),
        label = "knob",
    )
    Box(
        modifier = modifier
            .size(width = 46.dp, height = 26.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(if (checked) c.volt else Color(0xFF3A3F47))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onCheckedChange(!checked) },
    ) {
        Box(
            modifier = Modifier
                .offset(x = knobOffset, y = 3.dp)
                .size(20.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(if (checked) c.ink else Color(0xFFF2F3F5)),
        )
    }
}

data class SegOption(val key: String, val label: String)

/** Volt-active segmented control; track surface + line border, 4dp padding. */
@Composable
fun SegmentedControl(
    options: List<SegOption>,
    selectedKey: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    fontSize: Int = 14,
    itemPadding: Int = 10,
) {
    val c = SpotterTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(SpotterTheme.shapes.input)
            .background(c.surface)
            .border(1.dp, c.line, SpotterTheme.shapes.input)
            .padding(4.dp),
    ) {
        options.forEach { opt ->
            val active = opt.key == selectedKey
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(SpotterTheme.shapes.segmentItem)
                    .background(if (active) c.volt else Color.Transparent)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { onSelect(opt.key) }
                    .padding(vertical = itemPadding.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    opt.label,
                    color = if (active) c.ink else c.txt2,
                    style = SpotterTheme.type.label.copy(
                        fontSize = fontSize.sp, fontWeight = FontWeight.W700,
                    ),
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                )
            }
        }
    }
}

/** Rounded sort/filter pill: active = volt tint + accent text. */
@Composable
fun SortPill(
    label: String,
    active: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val c = SpotterTheme.colors
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (active) c.volt.copy(alpha = 0.12f) else Color.Transparent)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onClick() }
            .padding(horizontal = 11.dp, vertical = 6.dp),
    ) {
        Text(
            label,
            style = SpotterTheme.type.bodySm.copy(fontWeight = FontWeight.W700, fontSize = 12.sp),
            color = if (active) c.accent else c.txt3,
        )
    }
}

/**
 * Selectable pill with solid-volt active variant (contact prefs, request type…).
 */
@Composable
fun ChoiceChip(
    label: String,
    active: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val c = SpotterTheme.colors
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (active) c.volt else c.surface)
            .border(1.dp, if (active) c.volt else c.line, RoundedCornerShape(999.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onClick() }
            .padding(horizontal = 14.dp, vertical = 9.dp),
    ) {
        Text(
            label,
            style = SpotterTheme.type.labelSm,
            color = if (active) c.ink else c.txt2,
        )
    }
}

/** Diagonally-striped image placeholder with a mono caption. */
@Composable
fun StripedPlaceholder(
    caption: String,
    modifier: Modifier = Modifier,
    height: Int? = null,
    shape: RoundedCornerShape = SpotterTheme.shapes.input,
) {
    val c = SpotterTheme.colors
    val stripe = Brush.linearGradient(
        colors = listOf(
            c.mono.copy(alpha = 0.28f), c.mono.copy(alpha = 0.28f),
            Color.Transparent, Color.Transparent,
        ),
        start = androidx.compose.ui.geometry.Offset(0f, 0f),
        end = androidx.compose.ui.geometry.Offset(14f, 14f),
        tileMode = TileMode.Repeated,
    )
    var m = modifier
        .fillMaxWidth()
        .clip(shape)
        .background(c.surface2)
        .background(stripe)
    if (height != null) m = m.height(height.dp)
    Box(m, contentAlignment = Alignment.Center) {
        Text(caption, style = SpotterTheme.type.mono, color = c.mono)
    }
}
