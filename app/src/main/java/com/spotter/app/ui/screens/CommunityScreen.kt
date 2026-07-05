package com.spotter.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.material.icons.rounded.Event
import androidx.compose.material.icons.rounded.Group
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.data.Community
import com.spotter.app.data.Event
import com.spotter.app.data.SampleData
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.AdCard
import com.spotter.app.ui.components.AvatarTile
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SpotterCard
import com.spotter.app.ui.components.StripedPlaceholder
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun CommunityScreen(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val scroll = rememberScrollState()
    val events = vm.allEvents()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scroll)
            .padding(horizontal = 18.dp)
            .padding(top = 20.dp, bottom = 26.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Train with people nearby", style = t.bodySm, color = c.txt3)
                Spacer(Modifier.height(3.dp))
                Text("Community", style = t.pageTitle, color = c.txt)
            }
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(SpotterTheme.shapes.input)
                    .background(c.volt)
                    .clickable { vm.openStartCommunity() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.Add, contentDescription = "Start community", tint = c.ink, modifier = Modifier.size(22.dp))
            }
        }

        Spacer(Modifier.height(22.dp))
        SectionHeading("Happening soon")
        Spacer(Modifier.height(11.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            events.take(5).forEach { event ->
                EventPreviewCard(event = event, onOpen = { vm.openEvent(event.id, null) })
            }
        }

        Spacer(Modifier.height(22.dp))
        if (vm.adsHidden["community"] != true) {
            AdCard(
                ad = SampleData.ads.getValue("community"),
                onOpen = {},
                onHide = { vm.adsHidden["community"] = true },
            )
            Spacer(Modifier.height(22.dp))
        }

        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            SectionHeading("Communities", modifier = Modifier.weight(1f))
            Text("Request a sport", style = t.labelSm, color = c.accent, modifier = Modifier.clickable { vm.openRequest() })
        }
        Spacer(Modifier.height(11.dp))
        SampleData.communities.forEach { community ->
            CommunityListCard(
                community = community,
                joined = community.id in vm.joinedCommunities,
                onOpen = { vm.openCommunity(community.id) },
                onToggle = { vm.toggleCommunity(community.id) },
            )
            Spacer(Modifier.height(11.dp))
        }
    }
}

@Composable
private fun EventPreviewCard(event: Event, onOpen: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(modifier = Modifier.width(238.dp), onClick = onOpen) {
        Column(Modifier.padding(12.dp)) {
            StripedPlaceholder(event.type.lowercase() + " image", height = 94)
            Spacer(Modifier.height(10.dp))
            MicroBadge(event.type, bg = if (event.isMeetup) c.volt.copy(alpha = 0.12f) else c.amber.copy(alpha = 0.18f), fg = if (event.isMeetup) c.accent else c.amberText)
            Spacer(Modifier.height(8.dp))
            Text(event.title, style = t.name, color = c.txt, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(4.dp))
            Text(event.loc, style = t.bodySm, color = c.txt2, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Event, null, tint = c.accent, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(6.dp))
                Text(event.whenLabel, style = t.labelSm, color = c.strong, modifier = Modifier.weight(1f))
                Text("${event.attendees} going", style = t.caption, color = c.txt3)
            }
        }
    }
}

@Composable
private fun CommunityListCard(community: Community, joined: Boolean, onOpen: () -> Unit, onToggle: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(onClick = onOpen) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            AvatarTile(community.code, community.tint)
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(community.sport, style = t.name, color = c.txt)
                    if (community.official) {
                        Spacer(Modifier.width(7.dp))
                        MicroBadge("Official", c.volt.copy(alpha = 0.10f), c.accent)
                    }
                }
                Spacer(Modifier.height(3.dp))
                Text(community.about, style = t.bodySm, color = c.txt2, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(7.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Group, null, tint = c.txt3, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(5.dp))
                    Text("${community.members} members", style = t.caption, color = c.txt3)
                }
            }
            Spacer(Modifier.width(10.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (joined) c.surface2 else c.volt)
                    .border(1.dp, if (joined) c.line else c.volt, RoundedCornerShape(999.dp))
                    .clickable { onToggle() }
                    .padding(horizontal = 13.dp, vertical = 8.dp),
            ) {
                Text(if (joined) "Joined" else "Join", style = t.bodySm.copy(fontWeight = FontWeight.W700, fontSize = 12.sp), color = if (joined) c.txt2 else c.ink)
            }
        }
    }
}
