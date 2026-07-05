package com.spotter.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Loyalty
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Percent
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.UploadFile
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.spotter.app.data.CalProvider
import com.spotter.app.data.Role
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.AvatarTile
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.SegOption
import com.spotter.app.ui.components.SegmentedControl
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SpotterCard
import com.spotter.app.ui.components.SpotterToggle
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun ProfileScreen(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp)
            .padding(top = 20.dp, bottom = 26.dp),
    ) {
        Text("Your training home", style = t.bodySm, color = c.txt3)
        Spacer(Modifier.height(3.dp))
        Text("Profile", style = t.pageTitle, color = c.txt)
        Spacer(Modifier.height(18.dp))

        SpotterCard {
            Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                AvatarTile("AM", c.avatarBg, size = 64, radius = 17, fontSize = 22)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Alex Morgan", style = t.overlayTitle, color = c.txt)
                        Spacer(Modifier.width(7.dp))
                        Icon(Icons.Rounded.Verified, null, tint = c.accent, modifier = Modifier.size(17.dp))
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        when (vm.role) {
                            Role.COACH -> "Strength coach · Iron Yard Gym, Hamra"
                            Role.ADMIN -> "System administrator"
                            else -> "Training for first marathon 🏃"
                        },
                        style = t.bodySm, color = c.txt2,
                    )
                    Spacer(Modifier.height(8.dp))
                    Row {
                        when (vm.role) {
                            Role.COACH -> MicroBadge("Coach", c.volt.copy(alpha = 0.14f), c.accent)
                            Role.ADMIN -> MicroBadge("Admin", c.danger.copy(alpha = 0.14f), c.danger)
                            else -> MicroBadge("User", c.volt.copy(alpha = 0.12f), c.accent)
                        }
                        Spacer(Modifier.width(7.dp))
                        MicroBadge("Beirut", c.surface2, c.txt2)
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            val stats = when (vm.role) {
                Role.COACH -> listOf("640+" to "Sessions", "38" to "Clients", "★ 4.9" to "Rating")
                Role.ADMIN -> listOf("12.4k" to "Users", "312" to "Coaches", "3" to "Reports")
                else -> listOf("48" to "Sessions", "7" to "Partners", "12" to "Day streak")
            }
            stats.forEach { (num, label) ->
                SpotterCard(modifier = Modifier.weight(1f)) {
                    Column(Modifier.fillMaxWidth().padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(num, style = t.price.copy(fontSize = 23.sp), color = c.accent)
                        Spacer(Modifier.height(2.dp))
                        Text(label, style = t.caption, color = c.txt2)
                    }
                }
            }
        }

        Spacer(Modifier.height(22.dp))
        SectionHeading("My goals")
        Spacer(Modifier.height(11.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GoalChip("Run a marathon", highlight = true)
            GoalChip("Build endurance", highlight = false)
            GoalChip("Stay consistent", highlight = false)
        }

        if (vm.role != Role.ADMIN) {
            Spacer(Modifier.height(22.dp))
            SectionHeading("Qualifications")
            Spacer(Modifier.height(11.dp))
            vm.myCerts.forEach { cert ->
                CertCard(
                    name = cert.name, meta = "${cert.issuer} · ${cert.year}", verified = cert.verified,
                    onRemove = { vm.removeCert(cert.id) },
                )
                Spacer(Modifier.height(10.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AddCertButton(Icons.Rounded.PhotoCamera, "Scan with camera", Modifier.weight(1f)) { vm.addCert("Scanned certificate") }
                AddCertButton(Icons.Rounded.UploadFile, "Upload file", Modifier.weight(1f)) { vm.addCert("Uploaded certificate") }
            }
        }

        if (vm.role == Role.USER) {
            Spacer(Modifier.height(22.dp))
            RoleCard(
                title = "Become a coach",
                body = "List your services, get booked, and earn. Subscription unlocks scheduling, payments & a public coach profile.",
                badge = null,
                buttonLabel = "Start coaching",
            ) { vm.role = Role.COACH }
        }

        if (vm.role == Role.COACH) {
            Spacer(Modifier.height(22.dp))
            RoleCard(
                title = "Coach subscription",
                body = "Scheduling, payments and your public coach profile are active.",
                badge = "Active",
                buttonLabel = "Manage",
            ) {}
            Spacer(Modifier.height(22.dp))
            SectionHeading("Coach tools")
            Spacer(Modifier.height(11.dp))
            SpotterCard {
                Column(Modifier.padding(15.dp)) {
                    CoachToolRow("2", "Appointment requests", "Approve bookings & change requests") { vm.overlay = "coachRequests" }
                    Spacer(Modifier.height(13.dp))
                    CoachToolRow(null, "My schedule", "Edit weekly timetable") { vm.overlay = "coachSchedule" }
                    Spacer(Modifier.height(13.dp))
                    CoachToolRow(null, "Packages, pricing & promos", "Set prices · create discounts") { vm.overlay = "coachPackages" }
                }
            }
        }

        Spacer(Modifier.height(22.dp))
        SectionHeading("My training")
        Spacer(Modifier.height(11.dp))
        SettingsRow(Icons.Rounded.Schedule, "Bookings", "Packages, upcoming sessions and past ratings") { vm.openBookings() }
        Spacer(Modifier.height(10.dp))
        SettingsRow(Icons.Rounded.Notifications, "Notifications", "Platform updates and daily plan briefing") { vm.openNotifs() }

        Spacer(Modifier.height(22.dp))
        SectionHeading("Notification preferences")
        Spacer(Modifier.height(11.dp))
        ToggleCard("Push notifications", "Session changes, messages and platform updates", vm.pushOn) { vm.pushOn = it }
        Spacer(Modifier.height(10.dp))
        ToggleCard("Daily plan briefing", "Morning summary of sessions and community events", vm.dailyPlanOn) { vm.dailyPlanOn = it }
        Spacer(Modifier.height(10.dp))
        ToggleCard("Calendar sync", "Push confirmed sessions and changes to your calendar", vm.calSyncOn) { vm.calSyncOn = it }
        if (vm.calSyncOn) {
            Spacer(Modifier.height(10.dp))
            SegmentedControl(
                options = CalProvider.entries.map { SegOption(it.name, it.label) },
                selectedKey = vm.calProvider.name,
                onSelect = { vm.calProvider = CalProvider.valueOf(it) },
                fontSize = 13,
                itemPadding = 8,
            )
            Spacer(Modifier.height(8.dp))
            Text("Confirmed sessions and changes are pushed automatically.", style = t.caption, color = c.txt3)
        }

        Spacer(Modifier.height(22.dp))
        SectionHeading("Appearance")
        Spacer(Modifier.height(11.dp))
        ToggleCard("Dark theme", "Match the handoff default dark athletic UI", vm.isDark) { vm.isDark = it }

        Spacer(Modifier.height(22.dp))
        SectionHeading("Demo role")
        Spacer(Modifier.height(11.dp))
        SegmentedControl(
            options = listOf(SegOption("USER", "User"), SegOption("COACH", "Coach"), SegOption("ADMIN", "Admin")),
            selectedKey = vm.role.name,
            onSelect = { vm.role = Role.valueOf(it) },
            fontSize = 13,
            itemPadding = 8,
        )

        if (vm.role == Role.ADMIN) {
            Spacer(Modifier.height(22.dp))
            SectionHeading("Admin console")
            Spacer(Modifier.height(11.dp))
            AdminQueueCard(vm)
        }
    }
}

@Composable
private fun GoalChip(label: String, highlight: Boolean) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    androidx.compose.foundation.layout.Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (highlight) c.volt.copy(alpha = 0.10f) else c.surface)
            .border(1.dp, if (highlight) c.volt.copy(alpha = 0.25f) else c.line, RoundedCornerShape(999.dp))
            .padding(horizontal = 14.dp, vertical = 9.dp),
    ) {
        Text(label, style = t.labelSm.copy(fontWeight = FontWeight.W600), color = if (highlight) c.accent else c.strong)
    }
}

@Composable
private fun CertCard(name: String, meta: String, verified: Boolean, onRemove: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier.size(40.dp).clip(RoundedCornerShape(11.dp)).background(c.volt.copy(alpha = 0.10f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.WorkspacePremium, null, tint = c.accent, modifier = Modifier.size(19.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(name, style = t.labelSm, color = c.txt)
                Spacer(Modifier.height(1.dp))
                Text(meta, style = t.bodySm, color = c.txt2)
            }
            MicroBadge(
                if (verified) "Verified" else "Pending",
                if (verified) c.volt.copy(alpha = 0.12f) else c.amber.copy(alpha = 0.16f),
                if (verified) c.accent else c.amberText,
            )
            Spacer(Modifier.width(8.dp))
            androidx.compose.foundation.layout.Box(
                modifier = Modifier.size(24.dp).clip(RoundedCornerShape(99.dp)).background(c.surface2).clickable { onRemove() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.Close, null, tint = c.txt2, modifier = Modifier.size(11.dp))
            }
        }
    }
}

@Composable
private fun AddCertButton(icon: ImageVector, label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .border(1.5.dp, c.line, RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .padding(vertical = 13.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = c.accent, modifier = Modifier.size(17.dp))
        Spacer(Modifier.width(8.dp))
        Text(label, style = t.labelSm.copy(fontWeight = FontWeight.W700), color = c.strong)
    }
}

@Composable
private fun RoleCard(title: String, body: String, badge: String?, buttonLabel: String, onButton: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(background = c.volt.copy(alpha = 0.08f), borderColor = c.volt.copy(alpha = 0.25f)) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title, style = t.overlayTitle.copy(fontSize = 16.sp), color = c.txt, modifier = Modifier.weight(1f))
                if (badge != null) MicroBadge(badge, c.volt.copy(alpha = 0.14f), c.accent)
            }
            Spacer(Modifier.height(7.dp))
            Text(body, style = t.bodySm, color = c.txt2)
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.weight(1f), verticalAlignment = Alignment.Bottom) {
                    Text("$19", style = t.price.copy(fontSize = 20.sp), color = c.accent)
                    Text("/month", style = t.bodySm, color = c.txt3)
                }
                androidx.compose.foundation.layout.Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(c.volt)
                        .clickable { onButton() }
                        .padding(horizontal = 20.dp, vertical = 11.dp),
                ) {
                    Text(buttonLabel, style = t.labelSm.copy(fontWeight = FontWeight.W800), color = c.ink)
                }
            }
        }
    }
}

@Composable
private fun CoachToolRow(count: String?, title: String, body: String, onOpen: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(SpotterTheme.shapes.input)
            .clickable { onOpen() },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(if (count != null) c.volt.copy(alpha = 0.12f) else c.surface2),
            contentAlignment = Alignment.Center,
        ) {
            if (count != null) {
                Text(count, style = t.priceSm, color = c.accent)
            } else {
                Icon(Icons.Rounded.ChevronRight, null, tint = c.accent, modifier = Modifier.size(18.dp))
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = t.name, color = c.txt)
            Text(body, style = t.bodySm, color = c.txt2)
        }
        Icon(Icons.Rounded.ChevronRight, null, tint = c.txt3, modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun ToggleCard(title: String, body: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard {
        Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(title, style = t.name, color = c.txt)
                Spacer(Modifier.height(3.dp))
                Text(body, style = t.bodySm, color = c.txt2)
            }
            Spacer(Modifier.width(12.dp))
            SpotterToggle(checked = checked, onCheckedChange = onChange)
        }
    }
}

@Composable
private fun SettingsRow(icon: ImageVector, title: String, body: String, onOpen: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(onClick = onOpen) {
        Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(c.surface2),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = c.accent, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = t.name, color = c.txt)
                Spacer(Modifier.height(3.dp))
                Text(body, style = t.bodySm, color = c.txt2)
            }
            Icon(Icons.Rounded.ChevronRight, null, tint = c.txt3, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun AdminQueueCard(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard {
        Column(Modifier.padding(15.dp)) {
            SettingsRowInline(Icons.Rounded.AccountBalance, "Accounting", "Margins, expenses, profit shares") { vm.overlay = "adminAccounting" }
            Spacer(Modifier.height(13.dp))
            SettingsRowInline(Icons.Rounded.Person, "Approvals", "Hobby requests, communities and shop partners") { vm.overlay = "adminApprovals" }
            Spacer(Modifier.height(13.dp))
            SettingsRowInline(Icons.Rounded.Flag, "Misconduct reports", "Review evidence · ban or suspend") { vm.overlay = "adminReports" }
            Spacer(Modifier.height(13.dp))
            SettingsRowInline(Icons.Rounded.Percent, "Promotions & promo codes", "Create discounts · generate codes") { vm.overlay = "adminPromos" }
            Spacer(Modifier.height(13.dp))
            SettingsRowInline(Icons.Rounded.Loyalty, "Loyalty offers", "Edit rewards & point costs") { vm.overlay = "adminLoyalty" }
            Spacer(Modifier.height(13.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                MicroBadge("Admins only", c.volt.copy(alpha = 0.12f), c.accent)
                Spacer(Modifier.width(8.dp))
                Text("3-admin approval is enforced for fee/share changes.", style = t.caption.copy(fontWeight = FontWeight.W600), color = c.txt3)
            }
        }
    }
}

@Composable
private fun SettingsRowInline(icon: ImageVector, title: String, body: String, onOpen: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(SpotterTheme.shapes.input)
            .clickable { onOpen() },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(c.surface2),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = c.accent, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = t.name, color = c.txt)
            Text(body, style = t.bodySm, color = c.txt2)
        }
        Icon(Icons.Rounded.ChevronRight, null, tint = c.txt3, modifier = Modifier.size(20.dp))
    }
}
