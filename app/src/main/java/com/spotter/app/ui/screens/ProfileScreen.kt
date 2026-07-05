package com.spotter.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Loyalty
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Percent
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Verified
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
                    Text("Running, strength, mobility", style = t.bodySm, color = c.txt2)
                    Spacer(Modifier.height(8.dp))
                    Row {
                        MicroBadge(vm.role.name.lowercase(), c.volt.copy(alpha = 0.12f), c.accent)
                        Spacer(Modifier.width(7.dp))
                        MicroBadge("Beirut", c.surface2, c.txt2)
                    }
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
