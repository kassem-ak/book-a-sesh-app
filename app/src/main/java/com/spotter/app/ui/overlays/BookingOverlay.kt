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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.data.SampleData
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun BookingOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val person = SampleData.personById(vm.openId)

    Column(Modifier.fillMaxSize().background(c.bg)) {
        // header
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 18.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SmallBack { vm.backToPerson() }
            Spacer(Modifier.width(13.dp))
            Text("Book ${person.firstName}", style = t.overlayTitle, color = c.txt)
        }

        if (!vm.booked) {
            Column(
                modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 18.dp, end = 18.dp, top = 14.dp, bottom = 18.dp),
            ) {
                SectionHeading("Select day")
                Spacer(Modifier.height(11.dp))
                CalendarCard(vm)
                Spacer(Modifier.height(22.dp))

                SectionHeading("Available times")
                Spacer(Modifier.height(11.dp))
                val (slots, _) = slotsFor(person, vm.bookDay, vm.bookSlot)
                slots.chunked(3).forEach { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        row.forEach { slot ->
                            val bg = if (slot.selected) c.volt else c.surface
                            val fg = if (slot.taken) c.mono else if (slot.selected) c.ink else c.strong
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(SpotterTheme.shapes.buttonSm)
                                    .background(bg)
                                    .border(1.dp, if (slot.selected) c.volt else c.line, SpotterTheme.shapes.buttonSm)
                                    .clickable(
                                        interactionSource = remember { MutableInteractionSource() },
                                        indication = null,
                                        enabled = !slot.taken,
                                    ) { vm.bookSlot = slot.idx }
                                    .padding(vertical = 13.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    slot.label, color = fg,
                                    style = t.label.copy(textDecoration = if (slot.taken) TextDecoration.LineThrough else null),
                                )
                            }
                        }
                        repeat(3 - row.size) { Box(Modifier.weight(1f)) {} }
                    }
                    Spacer(Modifier.height(9.dp))
                }
                Spacer(Modifier.height(15.dp))

                SectionHeading("Package")
                Spacer(Modifier.height(11.dp))
                packagesFor(person).forEach { pkg ->
                    val sel = vm.bookPkg == pkg.key
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (sel) c.volt.copy(alpha = 0.08f) else c.surface)
                            .border(1.5.dp, if (sel) c.volt else c.line, RoundedCornerShape(16.dp))
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                            ) { vm.bookPkg = pkg.key }
                            .padding(15.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(22.dp)
                                .clip(RoundedCornerShape(999.dp))
                                .border(2.dp, if (sel) c.volt else c.txt3, RoundedCornerShape(999.dp)),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (sel) Box(Modifier.size(11.dp).clip(RoundedCornerShape(999.dp)).background(c.volt))
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(pkg.name, style = t.name.copy(fontSize = 15.sp), color = c.txt)
                            Spacer(Modifier.height(2.dp))
                            Text(pkg.sub, style = t.bodySm, color = c.txt2)
                        }
                        Text("$${pkg.price}", style = t.price, color = c.accent)
                    }
                    Spacer(Modifier.height(10.dp))
                }
            }

            // ---- confirm bar ----
            val pkg = packagesFor(person).first { it.key == vm.bookPkg }
            val (_, eff) = slotsFor(person, vm.bookDay, vm.bookSlot)
            val slotLabel = SampleData.slotDefs[eff]
            val summary = "${selDow(vm.bookDay)} ${selNum(vm.bookDay)} · $slotLabel · ${pkg.name}"
            Box(Modifier.fillMaxWidth().height(1.dp).background(c.line))
            Column(Modifier.fillMaxWidth().background(c.bg).padding(horizontal = 16.dp, vertical = 13.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(summary, style = t.bodySm, color = c.txt2)
                    Text("$${pkg.price}", style = t.overlayTitle.copy(fontSize = 20.sp), color = c.accent)
                }
                Spacer(Modifier.height(11.dp))
                Box(
                    modifier = Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(15.dp)).background(c.volt)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { vm.confirmBooking() },
                    contentAlignment = Alignment.Center,
                ) { Text("Confirm & pay", style = t.overlayTitle.copy(fontSize = 16.sp), color = c.ink) }
            }
        } else {
            BookedSuccess(vm)
        }
    }
}

@Composable
private fun BookedSuccess(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val person = SampleData.personById(vm.openId)
    val pkg = packagesFor(person).first { it.key == vm.bookPkg }
    val (_, eff) = slotsFor(person, vm.bookDay, vm.bookSlot)
    val confirmLine = "${person.firstName} confirmed your ${pkg.name.lowercase()} for ${selDow(vm.bookDay)} ${selNum(vm.bookDay)} at ${SampleData.slotDefs[eff]}."

    Column(
        modifier = Modifier.fillMaxSize().padding(30.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier.size(84.dp).clip(RoundedCornerShape(999.dp)).background(c.volt.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier.size(60.dp).clip(RoundedCornerShape(999.dp)).background(c.volt),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.Check, null, tint = c.ink, modifier = Modifier.size(32.dp)) }
        }
        Spacer(Modifier.height(22.dp))
        Text("You're booked!", style = t.overlayTitle.copy(fontSize = 24.sp), color = c.txt)
        Spacer(Modifier.height(8.dp))
        Text(confirmLine, style = t.bodyLg, color = c.txt2, textAlign = TextAlign.Center, modifier = Modifier.widthIn(max = 280.dp))
        Spacer(Modifier.height(14.dp))
        if (vm.calSyncOn) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.CalendarMonth, null, tint = c.accent, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(7.dp))
                Text("Added to your ${vm.calProvider.label} Calendar", style = t.labelSm, color = c.accent)
            }
            Spacer(Modifier.height(26.dp))
        } else {
            Spacer(Modifier.height(16.dp))
        }
        Box(
            modifier = Modifier.fillMaxWidth().widthIn(max = 280.dp).height(52.dp).clip(RoundedCornerShape(15.dp)).background(c.volt)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { vm.goToBookings() },
            contentAlignment = Alignment.Center,
        ) { Text("View in bookings", style = t.overlayTitle.copy(fontSize = 16.sp), color = c.ink) }
        Spacer(Modifier.height(12.dp))
        Text("Back to discover", style = t.labelSm, color = c.txt2, modifier = Modifier.clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = null,
        ) { vm.closeOverlay() })
    }
}

@Composable
private fun CalendarCard(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val person = SampleData.personById(vm.openId)
    val cells = calendarCells(person, vm.bookDay)
    Column(
        modifier = Modifier.fillMaxWidth().clip(SpotterTheme.shapes.card).background(c.surface)
            .border(1.dp, c.line, SpotterTheme.shapes.card).padding(15.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Box(Modifier.size(32.dp).clip(RoundedCornerShape(10.dp)).background(c.surface2), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.ChevronLeft, null, tint = c.txt2, modifier = Modifier.size(16.dp))
            }
            Text(SampleData.monthLabel, style = t.overlayTitle.copy(fontSize = 16.sp), color = c.txt)
            Box(Modifier.size(32.dp).clip(RoundedCornerShape(10.dp)).background(c.surface2), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.ChevronRight, null, tint = c.txt2, modifier = Modifier.size(16.dp))
            }
        }
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth()) {
            weekdayLabels.forEach { w ->
                Box(Modifier.weight(1f).height(26.dp), contentAlignment = Alignment.Center) {
                    Text(w, style = t.labelSm.copy(fontSize = 11.sp), color = c.txt3)
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                week.forEach { cell -> DayCell(cell, Modifier.weight(1f)) { cell.day?.let { vm.bookDay = it } } }
                repeat(7 - week.size) { Box(Modifier.weight(1f)) {} }
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}

@Composable
private fun DayCell(cell: CalCell, modifier: Modifier, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    if (cell.day == null) { Box(modifier.height(42.dp)) {}; return }
    val bg = if (cell.state == CellState.SELECTED) c.volt else Color.Transparent
    val fg = when (cell.state) {
        CellState.PAST, CellState.FULL -> c.mono
        CellState.SELECTED -> c.ink
        CellState.TODAY -> c.accent
        CellState.WEEKEND -> c.txt3
        else -> c.strong
    }
    Box(
        modifier = modifier
            .height(42.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .then(if (cell.state == CellState.TODAY) Modifier.border(1.dp, c.accent, RoundedCornerShape(12.dp)) else Modifier)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                enabled = cell.selectable,
            ) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            cell.day.toString(),
            style = t.name.copy(fontFamily = com.spotter.app.ui.theme.Archivo, fontSize = 15.sp, textDecoration = if (cell.state == CellState.FULL) TextDecoration.LineThrough else null),
            color = fg,
        )
    }
}

@Composable
private fun SmallBack(onClick: () -> Unit) {
    val c = SpotterTheme.colors
    Box(
        modifier = Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(c.surface)
            .border(1.dp, c.line, RoundedCornerShape(12.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onClick() },
        contentAlignment = Alignment.Center,
    ) { Icon(Icons.Rounded.ChevronLeft, "Back", tint = c.txt, modifier = Modifier.size(20.dp)) }
}
