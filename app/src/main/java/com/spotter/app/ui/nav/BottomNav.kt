package com.spotter.app.ui.nav

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.draw.drawBehind
import com.spotter.app.ui.theme.SpotterTheme

private data class NavItem(val key: String, val label: String, val icon: ImageVector)

private val items = listOf(
    NavItem("discover", "Discover", Icons.Rounded.Search),
    NavItem("community", "Community", Icons.Outlined.Group),
    NavItem("shop", "Shop", Icons.Outlined.Storefront),
    NavItem("chat", "Chat", Icons.Outlined.ChatBubbleOutline),
    NavItem("profile", "Profile", Icons.Outlined.PersonOutline),
)

@Composable
fun SpotterBottomNav(
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = SpotterTheme.colors
    val navBarPad = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(c.nav)
            .drawBehind {
                drawLine(
                    color = c.line,
                    start = androidx.compose.ui.geometry.Offset(0f, 0f),
                    end = androidx.compose.ui.geometry.Offset(size.width, 0f),
                    strokeWidth = 1f,
                )
            }
            .padding(top = 9.dp, bottom = 7.dp + navBarPad, start = 6.dp, end = 6.dp),
    ) {
        items.forEach { item ->
            NavCell(item, active = item.key == selected) { onSelect(item.key) }
        }
    }
}

@Composable
private fun RowScope.NavCell(item: NavItem, active: Boolean, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    val color = if (active) c.volt else c.txt3
    Column(
        modifier = Modifier
            .weight(1f)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onClick() }
            .padding(vertical = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(item.icon, contentDescription = item.label, tint = color, modifier = Modifier.size(23.dp))
        Spacer(Modifier.height(4.dp))
        Text(item.label, style = SpotterTheme.type.navLabel, color = color)
    }
}
