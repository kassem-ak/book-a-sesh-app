package com.spotter.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.ChatBubble
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.spotter.app.data.Person
import com.spotter.app.data.SampleData
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.AvatarTile
import com.spotter.app.ui.components.SegOption
import com.spotter.app.ui.components.SegmentedControl
import com.spotter.app.ui.theme.SpotterTheme

private data class MapPin(val person: Person, val top: Float, val left: Float, val ring: Color, val boosted: Boolean)

@Composable
fun DiscoverMap(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val pins = listOf(
        MapPin(SampleData.partners[0], 0.38f, 0.32f, c.volt, false),
        MapPin(SampleData.coaches[0], 0.28f, 0.68f, c.amber, true),
        MapPin(SampleData.coaches[1], 0.62f, 0.24f, c.amber, true),
        MapPin(SampleData.partners[1], 0.70f, 0.62f, c.volt, false),
        MapPin(SampleData.coaches[2], 0.46f, 0.78f, c.line, false),
    )
    val nearest = SampleData.partners[0]

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(c.mapBg)
            .drawBehind {
                val step = 38.dp.toPx()
                var x = 0f
                while (x < size.width) {
                    drawLine(c.grid, Offset(x, 0f), Offset(x, size.height), 1f); x += step
                }
                var y = 0f
                while (y < size.height) {
                    drawLine(c.grid, Offset(0f, y), Offset(size.width, y), 1f); y += step
                }
            },
    ) {
        val w = maxWidth
        val h = maxHeight

        // ---- pins ----
        pins.forEach { pin ->
            val pinSize = 46.dp
            Box(
                modifier = Modifier
                    .offset(x = w * pin.left - pinSize / 2, y = h * pin.top - pinSize / 2)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { vm.openPerson(pin.person.id) },
            ) {
                Box(
                    modifier = Modifier
                        .size(pinSize)
                        .clip(RoundedCornerShape(999.dp))
                        .background(c.avatarBg)
                        .border(2.dp, pin.ring, RoundedCornerShape(999.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(pin.person.initials, style = t.initials.copy(), color = Color(0xFFF2F3F5))
                }
                if (pin.boosted) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 4.dp, y = (-4).dp)
                            .size(16.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(c.amber),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Rounded.Bolt, null, tint = c.ink, modifier = Modifier.size(9.dp))
                    }
                }
                // rating chip
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .offset(y = 10.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(c.nav)
                        .border(1.dp, c.line, RoundedCornerShape(999.dp))
                        .padding(horizontal = 7.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("★", color = c.amberText, style = t.microBadge)
                    Spacer(Modifier.width(3.dp))
                    Text(pin.person.ratingLabel, style = t.microBadge.copy(), color = c.txt)
                }
            }
        }

        // ---- user location dot ----
        Box(
            modifier = Modifier
                .offset(x = w / 2 - 9.dp, y = h / 2 - 9.dp)
                .size(18.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(c.volt.copy(alpha = 0.18f)),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                Modifier
                    .size(12.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(c.volt)
                    .border(2.dp, c.bg, RoundedCornerShape(999.dp)),
            )
        }

        // ---- floating search pill ----
        Row(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 20.dp, start = 18.dp, end = 18.dp)
                .fillMaxWidth()
                .clip(SpotterTheme.shapes.input)
                .background(c.surface)
                .border(1.dp, c.line, SpotterTheme.shapes.input)
                .padding(horizontal = 14.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Search, null, tint = c.txt3, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(10.dp))
            Text("Beirut · within 5 km · 14 nearby", style = t.body, color = c.txt2, modifier = Modifier.weight(1f))
            Text("Filters", style = t.microBadge.copy(), color = c.accent)
        }

        // ---- floating cards|map toggle ----
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 78.dp, start = 18.dp, end = 18.dp),
        ) {
            SegmentedControl(
                options = listOf(SegOption("cards", "Cards"), SegOption("map", "Map")),
                selectedKey = vm.discoverView,
                onSelect = { vm.discoverView = it },
                fontSize = 13,
                itemPadding = 8,
            )
        }

        // ---- docked nearest card ----
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(start = 14.dp, end = 14.dp, bottom = 16.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(c.surface)
                .border(1.dp, c.line, RoundedCornerShape(20.dp))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { vm.openPerson(nearest.id) }
                .padding(15.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AvatarTile(nearest.initials, c.avatarBg)
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text("${nearest.name} · 400 m", style = t.name, color = c.txt)
                Text("Running partner · ${nearest.goal}", style = t.bodySm, color = c.txt2)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("★", color = c.amberText, style = t.bodySm)
                    Spacer(Modifier.width(5.dp))
                    Text(nearest.ratingLabel, style = t.labelSm, color = c.txt)
                    Spacer(Modifier.width(5.dp))
                    Text("· ${nearest.level}", style = t.bodySm, color = c.txt3)
                }
            }
            Spacer(Modifier.width(10.dp))
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(c.volt)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { vm.openChat("m3") },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.ChatBubble, "Message", tint = c.ink, modifier = Modifier.size(20.dp))
            }
        }
    }
}
