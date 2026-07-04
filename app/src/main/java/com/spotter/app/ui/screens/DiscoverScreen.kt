package com.spotter.app.ui.screens

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.spotter.app.data.Person
import com.spotter.app.data.SampleData
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.AdCard
import com.spotter.app.ui.components.BoostedCard
import com.spotter.app.ui.components.PersonListCard
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SegOption
import com.spotter.app.ui.components.SegmentedControl
import com.spotter.app.ui.components.SortPill
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun DiscoverScreen(vm: SpotterViewModel) {
    if (vm.discoverView == "map") DiscoverMap(vm) else DiscoverCards(vm)
}

internal fun rankedFor(vm: SpotterViewModel): Pair<List<Person>, List<Person>> {
    val isCoach = vm.mode == "coaches"
    var base = if (isCoach) SampleData.coaches else SampleData.partners
    if (vm.sport != "All") base = base.filter { it.sport.startsWith(vm.sport) }
    val boosted = base.filter { it.boosted }.sortedByDescending { it.rating }
    val ranked = base.filter { !it.boosted }.let { list ->
        when (vm.sortBy) {
            "price" -> list.sortedBy { it.price ?: 0 }
            "distance" -> list.sortedBy { it.distance }
            else -> list.sortedByDescending { it.rating }
        }
    }
    return boosted to ranked
}

@Composable
private fun DiscoverCards(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val isCoach = vm.mode == "coaches"
    val (boosted, ranked) = rankedFor(vm)
    val ad = SampleData.ads.getValue("discover")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp)
            .padding(top = 20.dp, bottom = 26.dp),
    ) {
        // ---- header ----
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text("Hey Alex —", style = t.bodySm, color = c.txt3)
                Spacer(Modifier.height(3.dp))
                Text("Find your\ncoach or partner", style = t.pageTitle, color = c.txt)
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.LocationOn, null, tint = c.accent, modifier = Modifier.size(13.dp))
                    Spacer(Modifier.width(5.dp))
                    Text("Beirut, Lebanon", style = t.bodySm, color = c.txt2)
                }
            }
            NotifBell(unread = !vm.notifSeen, onClick = vm::openNotifs)
        }
        Spacer(Modifier.height(18.dp))

        // ---- search ----
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(SpotterTheme.shapes.input)
                .background(c.surface)
                .border(1.dp, c.line, SpotterTheme.shapes.input)
                .padding(horizontal = 14.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Search, null, tint = c.txt3, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(10.dp))
            Text("Search sports, hobbies, coaches…", style = t.bodyLg, color = c.txt3)
        }
        Spacer(Modifier.height(16.dp))

        // ---- coaches | partners ----
        SegmentedControl(
            options = listOf(SegOption("coaches", "Coaches"), SegOption("partners", "Training partners")),
            selectedKey = vm.mode,
            onSelect = { vm.mode = it; if (it != "coaches" && vm.sortBy == "price") vm.sortBy = "rating" },
        )
        Spacer(Modifier.height(18.dp))

        // ---- sport filter ----
        SportFilter(vm)
        Spacer(Modifier.height(20.dp))

        // ---- cards | map ----
        SegmentedControl(
            options = listOf(SegOption("cards", "Cards"), SegOption("map", "Map")),
            selectedKey = vm.discoverView,
            onSelect = { vm.discoverView = it },
            fontSize = 13,
            itemPadding = 8,
        )
        Spacer(Modifier.height(18.dp))

        // ---- featured ----
        if (isCoach && boosted.isNotEmpty()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Bolt, null, tint = c.amber, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(7.dp))
                SectionHeading("Featured coaches", color = c.amberText)
            }
            Spacer(Modifier.height(11.dp))
            boosted.forEach { p ->
                BoostedCard(p, onOpen = { vm.openPerson(p.id) })
                Spacer(Modifier.height(11.dp))
            }
            Spacer(Modifier.height(13.dp))
        }

        // ---- ad ----
        if (vm.adsHidden["discover"] != true) {
            AdCard(ad, onOpen = {}, onHide = { vm.adsHidden["discover"] = true })
            Spacer(Modifier.height(24.dp))
        }

        // ---- list heading + sort ----
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            SectionHeading(if (isCoach) "All coaches" else "Training partners")
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                SortPill("Rating", vm.sortBy == "rating") { vm.sortBy = "rating" }
                if (isCoach) SortPill("Price", vm.sortBy == "price") { vm.sortBy = "price" }
                SortPill("Distance", vm.sortBy == "distance") { vm.sortBy = "distance" }
            }
        }
        Spacer(Modifier.height(11.dp))
        ranked.forEach { p ->
            PersonListCard(p, onOpen = { vm.openPerson(p.id) })
            Spacer(Modifier.height(11.dp))
        }
    }
}

@Composable
private fun NotifBell(unread: Boolean, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(SpotterTheme.shapes.input)
            .background(c.surface)
            .border(1.dp, c.line, SpotterTheme.shapes.input)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Rounded.Notifications, "Notifications", tint = c.txt2, modifier = Modifier.size(20.dp))
        if (unread) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 9.dp, end = 10.dp)
                    .size(9.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(c.bg)
                    .padding(2.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(c.volt),
            )
        }
    }
}

@Composable
private fun SportFilter(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val label = if (vm.sport == "All") "All sports & hobbies" else vm.sport
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(SpotterTheme.shapes.input)
                .background(c.surface)
                .border(1.dp, c.line, SpotterTheme.shapes.input)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { vm.sportMenu = !vm.sportMenu }
                .padding(horizontal = 15.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Tune, null, tint = c.txt2, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(10.dp))
            Text(label, style = t.label, color = c.txt, modifier = Modifier.weight(1f))
            Icon(Icons.Rounded.ExpandMore, null, tint = c.txt3, modifier = Modifier.size(18.dp))
        }
        if (vm.sportMenu) {
            Spacer(Modifier.height(8.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(SpotterTheme.shapes.input)
                    .background(c.surface)
                    .border(1.dp, c.line, SpotterTheme.shapes.input)
                    .padding(6.dp),
            ) {
                SampleData.sportNames.forEach { s ->
                    val active = vm.sport == s
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(SpotterTheme.shapes.chipSm)
                            .background(if (active) c.volt.copy(alpha = 0.10f) else Color.Transparent)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                            ) { vm.sport = s; vm.sportMenu = false }
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(s, style = t.label, color = if (active) c.accent else c.strong, modifier = Modifier.weight(1f))
                        if (active) Icon(Icons.Rounded.Check, null, tint = c.accent, modifier = Modifier.size(16.dp))
                    }
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(SpotterTheme.shapes.chipSm)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { vm.overlay = "request"; vm.sportMenu = false }
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Rounded.Add, null, tint = c.accent, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(9.dp))
                    Text("Request a sport or hobby", style = t.labelSm, color = c.accent)
                }
            }
        }
    }
}
