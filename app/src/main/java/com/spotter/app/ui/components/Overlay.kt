package com.spotter.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.spotter.app.ui.theme.SpotterTheme

/** Full-screen overlay surface. Slide-up/fade is applied by the overlay host. */
@Composable
fun OverlayScaffold(
    modifier: Modifier = Modifier,
    header: @Composable (() -> Unit)? = null,
    bottomBar: @Composable (() -> Unit)? = null,
    scrollable: Boolean = true,
    content: @Composable ColumnScope.() -> Unit,
) {
    val c = SpotterTheme.colors
    val scroll = rememberScrollState()
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(c.bg),
    ) {
        header?.invoke()
        Column(
            modifier = Modifier
                .weight(1f)
                .then(if (scrollable) Modifier.verticalScroll(scroll) else Modifier),
        ) {
            content()
        }
        bottomBar?.invoke()
    }
}

/** Back header: 44dp back button, title, optional trailing content. */
@Composable
fun OverlayHeader(
    title: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    trailing: @Composable (RowScope.() -> Unit)? = null,
) {
    val c = SpotterTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(SpotterTheme.shapes.input)
                .background(c.surface)
                .border(1.dp, c.line, SpotterTheme.shapes.input)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { onBack() },
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.AutoMirrored.Rounded.ArrowBack,
                contentDescription = "Back",
                tint = c.txt2,
                modifier = Modifier.size(20.dp),
            )
        }
        Spacer(Modifier.width(12.dp))
        if (subtitle != null) {
            Column {
                Text(title, style = SpotterTheme.type.overlayTitle, color = c.txt)
                Text(subtitle, style = SpotterTheme.type.caption, color = c.txt3)
            }
        } else {
            Text(title, style = SpotterTheme.type.overlayTitle, color = c.txt)
        }
        if (trailing != null) {
            Spacer(Modifier.weight(1f))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.End) {
                trailing()
            }
        }
    }
}
