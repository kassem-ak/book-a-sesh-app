package com.spotter.app.ui.overlays

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.AvatarTile
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.OverlayHeader
import com.spotter.app.ui.components.OverlayScaffold
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SpotterCard
import com.spotter.app.ui.components.VoltButton
import com.spotter.app.ui.theme.SpotterTheme

// ---- demo data ported from the prototype's Component class ----

private data class ApptReq(
    val id: String,
    val who: String,
    val initials: String,
    val kind: String,
    val what: String,
    val note: String,
)

private val apptReqs = listOf(
    ApptReq("a1", "Alex Morgan", "AM", "NEW BOOKING", "Single session · Thu 09 · 6:30 PM", "Iron Yard Gym, Hamra"),
    ApptReq("a2", "Chris P.", "CP", "CHANGE REQUEST", "Move to Sat 11 · 8:00 AM", "was Fri 10 · 6:30 PM"),
)

private data class ClientPack(
    val who: String,
    val initials: String,
    val pack: String,
    val used: Int,
    val total: Int,
    val expiry: String,
)

private val clientPacks = listOf(
    ClientPack("Alex Morgan", "AM", "5-session pack", 3, 5, "Valid until Aug 29"),
    ClientPack("Chris P.", "CP", "5-session pack", 4, 5, "Valid until Jul 20"),
    ClientPack("Nadia R.", "NR", "Monthly plan", 9, 12, "Renews Jul 12"),
)

private val dayNames = mapOf(
    "MON" to "Monday", "TUE" to "Tuesday", "WED" to "Wednesday", "THU" to "Thursday",
    "FRI" to "Friday", "SAT" to "Saturday", "SUN" to "Sunday",
)

// ---- Appointment requests ----

@Composable
fun CoachRequestsOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    OverlayScaffold(header = { OverlayHeader("Appointment requests", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            apptReqs.forEach { req ->
                ApptReqCard(vm, req)
                Spacer(Modifier.height(11.dp))
            }
            Spacer(Modifier.height(13.dp))

            SectionHeading("Client packages")
            Spacer(Modifier.height(11.dp))
            clientPacks.forEach { pack ->
                ClientPackCard(pack)
                Spacer(Modifier.height(10.dp))
            }
            Spacer(Modifier.height(14.dp))

            SectionHeading("Rate your trainee")
            Spacer(Modifier.height(11.dp))
            SpotterCard {
                Column(Modifier.padding(15.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AvatarTile("AM", c.avatarBg, size = 40, radius = 12, fontSize = 14)
                        Spacer(Modifier.width(11.dp))
                        Column {
                            Text("Alex Morgan", style = t.name, color = c.txt)
                            Spacer(Modifier.height(1.dp))
                            Text(
                                if (vm.coachRate > 0) "Rated ${vm.coachRate}/5 — posted to Alex's public profile"
                                else "Session completed Mon · rating is 5-point, trained clients only",
                                style = t.bodySm, color = c.txt2,
                            )
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                        (1..5).forEach { n ->
                            Text(
                                "★",
                                fontSize = 30.sp,
                                color = if (vm.coachRate >= n) c.amber else c.mono,
                                modifier = Modifier.clickable { vm.coachRate = n }.padding(horizontal = 3.dp),
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            Text("You can rate and publicly review only trainees you've trained, on a 5-point scale.", style = t.bodySm, color = c.txt3)
        }
    }
}

@Composable
private fun ApptReqCard(vm: SpotterViewModel, req: ApptReq) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val decision = vm.apptDecisions[req.id]
    SpotterCard {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AvatarTile(req.initials, c.avatarBg, size = 40, radius = 12, fontSize = 14)
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text(req.who, style = t.name, color = c.txt)
                    Spacer(Modifier.height(1.dp))
                    Text(req.what, style = t.bodySm, color = c.txt2)
                }
                MicroBadge(req.kind, c.amber.copy(alpha = 0.14f), c.amberText)
            }
            Spacer(Modifier.height(10.dp))
            Text(req.note, style = t.caption, color = c.txt3)
            Spacer(Modifier.height(12.dp))
            if (decision == null) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ApptAction("Approve", c.volt, c.ink, Modifier.weight(1f)) { vm.apptDecisions[req.id] = "Approved" }
                    ApptAction("Decline", c.surface2, c.danger, Modifier.weight(1f)) { vm.apptDecisions[req.id] = "Declined" }
                }
            } else {
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(11.dp)).background(c.surface2).padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(decision, style = t.labelSm.copy(fontWeight = FontWeight.W800), color = if (decision == "Approved") c.accent else c.danger)
                }
            }
        }
    }
}

@Composable
private fun ApptAction(label: String, bg: androidx.compose.ui.graphics.Color, fg: androidx.compose.ui.graphics.Color, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val t = SpotterTheme.type
    Box(
        modifier = modifier.clip(RoundedCornerShape(11.dp)).background(bg).clickable { onClick() }.padding(vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = t.labelSm.copy(fontWeight = FontWeight.W800), color = fg)
    }
}

@Composable
private fun ClientPackCard(pack: ClientPack) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 13.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AvatarTile(pack.initials, c.avatarBg, size = 38, radius = 11, fontSize = 13)
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text("${pack.who} · ${pack.pack}", style = t.labelSm, color = c.txt)
                    Spacer(Modifier.height(1.dp))
                    Text("${pack.used} of ${pack.total} used · ${pack.expiry}", style = t.caption, color = c.txt2)
                }
                Text("${pack.total - pack.used} left", style = t.priceSm, color = c.accent)
            }
            Spacer(Modifier.height(10.dp))
            Box(Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(999.dp)).background(c.surface2)) {
                Box(
                    Modifier.fillMaxWidth(pack.used.toFloat() / pack.total).height(6.dp)
                        .clip(RoundedCornerShape(999.dp)).background(c.volt),
                )
            }
        }
    }
}

// ---- Schedule editor ----

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CoachScheduleOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    OverlayScaffold(header = { OverlayHeader("My schedule", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            Text("Set which slots clients can book, day by day. Changes apply to new bookings instantly.", style = t.body, color = c.txt2)
            Spacer(Modifier.height(20.dp))

            SectionHeading("Day")
            Spacer(Modifier.height(11.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN").forEach { day ->
                    val selected = vm.schedDay == day
                    val hasSlots = vm.schedule[day].orEmpty().isNotEmpty()
                    Column(
                        modifier = Modifier
                            .clip(RoundedCornerShape(13.dp))
                            .background(if (selected) c.volt else c.surface)
                            .border(1.dp, if (selected) c.volt else c.line, RoundedCornerShape(13.dp))
                            .clickable { vm.schedDay = day }
                            .padding(horizontal = 14.dp, vertical = 11.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(day, style = t.caption.copy(fontWeight = FontWeight.W800), color = if (selected) c.ink else c.txt2)
                        Spacer(Modifier.height(4.dp))
                        Box(
                            Modifier.size(5.dp).clip(RoundedCornerShape(99.dp))
                                .background(if (!hasSlots) androidx.compose.ui.graphics.Color.Transparent else if (selected) c.ink else c.accent),
                        )
                    }
                }
            }
            Spacer(Modifier.height(22.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                SectionHeading("Bookable slots", modifier = Modifier.weight(1f))
                Text("Set day off", style = t.caption.copy(fontWeight = FontWeight.W700), color = c.danger, modifier = Modifier.clickable { vm.setDayOff() })
            }
            Spacer(Modifier.height(11.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(9.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                vm.daySlots.forEach { slot ->
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(c.volt.copy(alpha = 0.10f))
                            .border(1.dp, c.volt.copy(alpha = 0.3f), RoundedCornerShape(999.dp))
                            .padding(start = 15.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(slot, style = t.labelSm, color = c.accent)
                        Spacer(Modifier.width(8.dp))
                        Box(
                            Modifier.size(22.dp).clip(RoundedCornerShape(99.dp)).background(c.surface2)
                                .clickable { vm.removeSlot(slot) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Rounded.Close, null, tint = c.txt2, modifier = Modifier.size(11.dp))
                        }
                    }
                }
            }
            Spacer(Modifier.height(18.dp))

            SpotterCard {
                Row(Modifier.padding(horizontal = 12.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    SchedStep(Icons.Rounded.Remove) { vm.addTimeIdx = (vm.addTimeIdx - 1).coerceAtLeast(0) }
                    Text(
                        vm.addTimeLabel,
                        style = t.overlayTitle.copy(fontSize = 16.sp),
                        color = c.txt,
                        modifier = Modifier.weight(1f),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                    SchedStep(Icons.Rounded.Add) { vm.addTimeIdx = (vm.addTimeIdx + 1).coerceAtMost(vm.schedTimes.lastIndex) }
                    Spacer(Modifier.width(10.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(11.dp))
                            .background(if (vm.canAddSlot) c.volt else c.surface2)
                            .clickable(enabled = vm.canAddSlot) { vm.addSlot() }
                            .padding(horizontal = 18.dp, vertical = 10.dp),
                    ) {
                        Text(if (vm.canAddSlot) "Add" else "Added", style = t.labelSm.copy(fontWeight = FontWeight.W800), color = if (vm.canAddSlot) c.ink else c.txt3)
                    }
                }
            }
            Spacer(Modifier.height(16.dp))

            SpotterCard {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Schedule, null, tint = c.accent, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (vm.daySlots.isEmpty()) "${dayNames[vm.schedDay]} is a day off"
                        else "${vm.daySlots.size} slot${if (vm.daySlots.size > 1) "s" else ""} bookable on ${dayNames[vm.schedDay]}s",
                        style = t.labelSm, color = c.strong,
                    )
                }
            }
        }
    }
}

@Composable
private fun SchedStep(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    Box(
        modifier = Modifier.size(32.dp).clip(RoundedCornerShape(10.dp)).background(c.surface2).clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = c.txt2, modifier = Modifier.size(14.dp))
    }
}

// ---- Packages & promos ----

@Composable
fun CoachPackagesOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    OverlayScaffold(header = { OverlayHeader("Packages & promos", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            SectionHeading("Your packages")
            Spacer(Modifier.height(11.dp))
            vm.myPackages.forEach { pkg ->
                SpotterCard {
                    Column(Modifier.padding(15.dp)) {
                        Row(verticalAlignment = Alignment.Top) {
                            Column(Modifier.weight(1f)) {
                                Text(pkg.name, style = t.name, color = c.txt)
                                Spacer(Modifier.height(2.dp))
                                Text(pkg.per, style = t.bodySm, color = c.txt2)
                            }
                            Box(
                                Modifier.size(26.dp).clip(RoundedCornerShape(99.dp)).background(c.surface2)
                                    .clickable { vm.removePkg(pkg.id) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Rounded.Close, null, tint = c.txt2, modifier = Modifier.size(12.dp))
                            }
                        }
                        Spacer(Modifier.height(13.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            PkgStepper(
                                value = "${pkg.sessions}", unit = "sessions", accent = false, modifier = Modifier.weight(1f),
                                onMinus = { vm.updPkg(pkg.id, dSessions = -1) }, onPlus = { vm.updPkg(pkg.id, dSessions = +1) },
                            )
                            PkgStepper(
                                value = "$${pkg.price}", unit = "total price", accent = true, modifier = Modifier.weight(1f),
                                onMinus = { vm.updPkg(pkg.id, dPrice = -5) }, onPlus = { vm.updPkg(pkg.id, dPrice = +5) },
                            )
                        }
                    }
                }
                Spacer(Modifier.height(11.dp))
            }
            Spacer(Modifier.height(7.dp))

            // dashed "new package" builder
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
                    .border(1.5.dp, c.line, RoundedCornerShape(16.dp)).padding(15.dp),
            ) {
                Text(
                    "New package — ${if (vm.newPkgSessions == 1) "Single session" else "${vm.newPkgSessions}-session pack"}",
                    style = t.labelSm, color = c.txt2,
                )
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PkgStepper(
                        value = "${vm.newPkgSessions}", unit = "sessions", accent = false, modifier = Modifier.weight(1f),
                        onMinus = { vm.newPkgSessions = (vm.newPkgSessions - 1).coerceAtLeast(1) },
                        onPlus = { vm.newPkgSessions += 1 },
                    )
                    PkgStepper(
                        value = "$${vm.newPkgPrice}", unit = "total price", accent = true, modifier = Modifier.weight(1f),
                        onMinus = { vm.newPkgPrice = (vm.newPkgPrice - 5).coerceAtLeast(5) },
                        onPlus = { vm.newPkgPrice += 5 },
                    )
                }
                Spacer(Modifier.height(12.dp))
                VoltButton("Add package", enabled = true) { vm.addPackage() }
            }
            Spacer(Modifier.height(26.dp))

            SectionHeading("Create a promo")
            Spacer(Modifier.height(11.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(10, 15, 20, 25).forEach { pctVal ->
                    val active = vm.cPromoPct == pctVal
                    Box(
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(13.dp))
                            .background(if (active) c.volt else c.surface)
                            .border(1.dp, if (active) c.volt else c.line, RoundedCornerShape(13.dp))
                            .clickable { vm.cPromoPct = pctVal; vm.cPromoCode = null }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("$pctVal%", style = t.price, color = if (active) c.ink else c.txt2)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            VoltButton("Generate my promo code", enabled = true) { vm.genCoachPromo() }
            Spacer(Modifier.height(24.dp))

            SectionHeading("Your active promos")
            Spacer(Modifier.height(11.dp))
            vm.cPromoCode?.let { code ->
                CoachPromoCard(code, "${vm.cPromoPct}% off your sessions · just created", fresh = true)
                Spacer(Modifier.height(10.dp))
            }
            CoachPromoCard("FIRST5", "$5 off a client's first session · always on", fresh = false)
            Spacer(Modifier.height(16.dp))
            Text("Your promos apply to your sessions only. Platform-wide promotions are managed by Spotter admins.", style = t.bodySm, color = c.txt3)
        }
    }
}

@Composable
private fun PkgStepper(value: String, unit: String, accent: Boolean, modifier: Modifier = Modifier, onMinus: () -> Unit, onPlus: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Row(
        modifier = modifier.clip(RoundedCornerShape(12.dp)).background(c.surface2).padding(horizontal = 8.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(28.dp).clip(RoundedCornerShape(9.dp)).background(c.bg).clickable { onMinus() },
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Remove, null, tint = c.txt2, modifier = Modifier.size(12.dp))
        }
        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = t.priceSm, color = if (accent) c.accent else c.txt)
            Text(unit, style = t.caption.copy(fontSize = 10.sp), color = c.txt3)
        }
        Box(
            Modifier.size(28.dp).clip(RoundedCornerShape(9.dp)).background(c.bg).clickable { onPlus() },
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Add, null, tint = c.txt2, modifier = Modifier.size(12.dp))
        }
    }
}

@Composable
private fun CoachPromoCard(code: String, sub: String, fresh: Boolean) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    code,
                    style = t.body.copy(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.W700, fontSize = 15.sp, letterSpacing = 0.5.sp),
                    color = c.accent,
                )
                Spacer(Modifier.height(2.dp))
                Text(sub, style = t.bodySm, color = c.txt2)
            }
            if (fresh) {
                Spacer(Modifier.width(10.dp))
                MicroBadge("NEW", c.volt.copy(alpha = 0.14f), c.accent)
            }
        }
    }
}
