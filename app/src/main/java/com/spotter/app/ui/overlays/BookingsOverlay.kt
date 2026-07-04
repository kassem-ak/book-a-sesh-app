package com.spotter.app.ui.overlays

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.OverlayHeader
import com.spotter.app.ui.components.OverlayScaffold
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.theme.SpotterTheme

private data class Pack(val who: String, val initials: String, val pack: String, val used: Int, val total: Int, val expiry: String)
private data class Upcoming(val who: String, val initials: String, val sport: String, val where: String, val whenLabel: String, val confirmed: Boolean, val statusOverride: String? = null, val canChange: Boolean = false)
private data class Past(val who: String, val initials: String, val sport: String, val whenLabel: String, val canRate: Boolean)

@Composable
fun BookingsOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type

    val packs = listOf(
        Pack("Marcus Reyes", "MR", "5-session pack", 3, 5, "Valid until Aug 29"),
        Pack("Tariq Aziz", "TA", "Monthly plan", 5, 12, "Renews Jul 28"),
    )
    val upcoming = listOf(
        Upcoming("Marcus Reyes", "MR", "Strength", "Iron Yard Gym, Hamra", "Today · 6:30 PM",
            confirmed = !vm.bookingChange, statusOverride = if (vm.bookingChange) "Change pending" else null, canChange = true),
        Upcoming("Mei Lin (partner)", "ML", "Climbing", "Urban Wall, Achrafieh", "Tomorrow · 8:00 AM",
            confirmed = false, statusOverride = "Pending", canChange = false),
    )
    val past = listOf(
        Past("Aïcha Bennani", "AB", "Boxing", "Mon · Completed", canRate = true),
        Past("Diego Santos", "DS", "Calisthenics", "Last week · Rated ★4.8", canRate = false),
    )

    OverlayScaffold(header = { OverlayHeader("Bookings", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            Spacer(Modifier.height(4.dp))
            SectionHeading("Active packages")
            Spacer(Modifier.height(11.dp))
            packs.forEach { p ->
                PackCard(p)
                Spacer(Modifier.height(11.dp))
            }
            Spacer(Modifier.height(13.dp))

            SectionHeading("Upcoming")
            Spacer(Modifier.height(11.dp))
            upcoming.forEach { b ->
                UpcomingCard(b, vm)
                Spacer(Modifier.height(11.dp))
            }
            Spacer(Modifier.height(13.dp))

            SectionHeading("Past")
            Spacer(Modifier.height(11.dp))
            past.forEach { b ->
                PastCard(b)
                Spacer(Modifier.height(11.dp))
            }
        }
    }
}

@Composable
private fun PackCard(p: Pack) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Column(
        Modifier.fillMaxWidth().clip(SpotterTheme.shapes.card).background(c.surface)
            .border(1.dp, c.line, SpotterTheme.shapes.card).padding(15.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Avatar(p.initials, 44)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("${p.pack} · ${p.who}", style = t.name.copy(fontSize = 15.sp), color = c.txt)
                Text("${p.used} of ${p.total} sessions used · ${p.expiry}", style = t.bodySm, color = c.txt2)
            }
            Text("${p.total - p.used} left", style = t.priceSm.copy(fontSize = 16.sp), color = c.accent)
        }
        Spacer(Modifier.height(12.dp))
        Box(Modifier.fillMaxWidth().height(7.dp).clip(RoundedCornerShape(999.dp)).background(c.surface2)) {
            Box(Modifier.fillMaxWidth(p.used.toFloat() / p.total).height(7.dp).clip(RoundedCornerShape(999.dp)).background(c.volt))
        }
    }
}

@Composable
private fun UpcomingCard(b: Upcoming, vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Column(
        Modifier.fillMaxWidth().clip(SpotterTheme.shapes.card).background(c.surface)
            .border(1.dp, c.line, SpotterTheme.shapes.card).padding(15.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Avatar(b.initials, 48)
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text(b.who, style = t.name, color = c.txt)
                Text("${b.sport} · ${b.where}", style = t.bodySm, color = c.txt2)
            }
            val status = b.statusOverride ?: "Confirmed"
            MicroBadge(
                status,
                bg = if (b.confirmed) c.volt.copy(alpha = 0.16f) else c.amber.copy(alpha = 0.18f),
                fg = if (b.confirmed) c.accent else c.amberText,
            )
        }
        Spacer(Modifier.height(13.dp))
        Box(Modifier.fillMaxWidth().height(1.dp).background(c.line))
        Spacer(Modifier.height(13.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Schedule, null, tint = c.accent, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(8.dp))
            Text(b.whenLabel, style = t.label.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.W600), color = c.strong)
            if (vm.calSyncOn) {
                Spacer(Modifier.width(8.dp))
                MicroBadge("In calendar ✓", c.volt.copy(alpha = 0.10f), c.accent)
            }
            if (b.canChange) {
                Spacer(Modifier.weight(1f))
                val changed = vm.bookingChange
                Text(
                    if (changed) "Change requested — waiting for coach" else "Request change",
                    style = t.bodySm.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.W700),
                    color = if (changed) c.txt3 else c.accent,
                    modifier = Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        enabled = !changed,
                    ) { vm.bookingChange = true },
                )
            }
        }
    }
}

@Composable
private fun PastCard(b: Past) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Row(
        Modifier.fillMaxWidth().clip(SpotterTheme.shapes.card).background(c.surface)
            .border(1.dp, c.line2, SpotterTheme.shapes.card).padding(15.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Avatar(b.initials, 48)
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text(b.who, style = t.name.copy(fontSize = 15.sp), color = c.txt)
            Text("${b.sport} · ${b.whenLabel}", style = t.bodySm, color = c.txt3)
        }
        if (b.canRate) {
            Box(
                Modifier.clip(RoundedCornerShape(999.dp)).background(c.volt).padding(horizontal = 13.dp, vertical = 7.dp),
            ) { Text("Rate", style = t.bodySm.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.W700), color = c.ink) }
        }
    }
}

@Composable
private fun Avatar(initials: String, size: Int) {
    val c = SpotterTheme.colors
    Box(
        Modifier.size(size.dp).clip(RoundedCornerShape((size / 3.4).dp)).background(c.avatarBg),
        contentAlignment = Alignment.Center,
    ) { Text(initials, style = SpotterTheme.type.initials.copy(fontSize = (size / 3.2).sp), color = Color(0xFFF2F3F5)) }
}
