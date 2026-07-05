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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Event
import androidx.compose.material.icons.rounded.Group
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.data.Event
import com.spotter.app.data.SampleData
import com.spotter.app.data.SubGroup
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.AvatarTile
import com.spotter.app.ui.components.ChoiceChip
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.OverlayHeader
import com.spotter.app.ui.components.OverlayScaffold
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SpotterCard
import com.spotter.app.ui.components.SpotterTextField
import com.spotter.app.ui.components.StripedPlaceholder
import com.spotter.app.ui.components.VoltButton
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun CommunityDetailOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val community = SampleData.communityById(vm.communityId)
    val joined = community.id in vm.joinedCommunities
    val subs = SampleData.subGroups[community.id].orEmpty()
    val events = vm.allEvents().filter { it.communityId == community.id }

    OverlayScaffold(
        header = {
            OverlayHeader("Community", vm::closeOverlay) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(c.volt)
                        .clickable { vm.openCreateEvent() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Add, null, tint = c.ink, modifier = Modifier.size(21.dp))
                }
            }
        },
    ) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            SpotterCard {
                Column(Modifier.padding(15.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AvatarTile(community.code, community.tint, size = 64, radius = 17, fontSize = 22)
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(community.sport, style = t.overlayTitle, color = c.txt)
                                if (community.official) {
                                    Spacer(Modifier.width(7.dp))
                                    MicroBadge("Official", c.volt.copy(alpha = 0.12f), c.accent)
                                }
                            }
                            Spacer(Modifier.height(4.dp))
                            Text("${community.members} members", style = t.bodySm, color = c.txt2)
                        }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .background(if (joined) c.surface2 else c.volt)
                                .clickable { vm.toggleCommunity(community.id) }
                                .padding(horizontal = 13.dp, vertical = 8.dp),
                        ) {
                            Text(if (joined) "Joined" else "Join", style = t.labelSm, color = if (joined) c.txt2 else c.ink)
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    Text(community.about, style = t.bodyLg.copy(lineHeight = 21.sp), color = c.soft)
                }
            }

            Spacer(Modifier.height(22.dp))
            SectionHeading("Location groups")
            Spacer(Modifier.height(11.dp))
            subs.forEach { sub ->
                SubGroupCard(sub, joined = sub.id in vm.joinedSubs) { vm.toggleSub(sub.id) }
                Spacer(Modifier.height(10.dp))
            }

            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                SectionHeading("Events", modifier = Modifier.weight(1f))
                Text("Create event", style = t.labelSm, color = c.accent, modifier = Modifier.clickable { vm.openCreateEvent() })
            }
            Spacer(Modifier.height(11.dp))
            events.forEach { event ->
                CommunityEventCard(event, onOpen = { vm.openEvent(event.id, "community") })
                Spacer(Modifier.height(11.dp))
            }
        }
    }
}

@Composable
private fun SubGroupCard(sub: SubGroup, joined: Boolean, onToggle: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(c.surface2),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.LocationOn, null, tint = c.accent, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(sub.name, style = t.name, color = c.txt)
                Text("${sub.area} - ${sub.members} members", style = t.bodySm, color = c.txt2)
            }
            Box(
                modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(if (joined) c.surface2 else c.volt).clickable { onToggle() }.padding(horizontal = 12.dp, vertical = 7.dp),
            ) {
                Text(if (joined) "Joined" else "Join", style = t.caption.copy(fontWeight = FontWeight.W800), color = if (joined) c.txt2 else c.ink)
            }
        }
    }
}

@Composable
private fun CommunityEventCard(event: Event, onOpen: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(onClick = onOpen) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(if (event.isMeetup) c.volt.copy(alpha = 0.12f) else c.amber.copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.Event, null, tint = if (event.isMeetup) c.accent else c.amberText, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MicroBadge(event.type, if (event.isMeetup) c.volt.copy(alpha = 0.12f) else c.amber.copy(alpha = 0.18f), if (event.isMeetup) c.accent else c.amberText)
                    Spacer(Modifier.width(7.dp))
                    Text(event.whenLabel, style = t.caption, color = c.txt3)
                }
                Spacer(Modifier.height(5.dp))
                Text(event.title, style = t.name, color = c.txt, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${event.loc} - ${event.attendees} going", style = t.bodySm, color = c.txt2, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
fun EventDetailOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val event = vm.allEvents().firstOrNull { it.id == vm.eventId } ?: SampleData.eventById(vm.eventId)
    val going = event.id in vm.goingEvents
    val back = if (vm.returnTo == "community") vm::backToCommunityFromEvent else vm::closeOverlay

    OverlayScaffold(header = { OverlayHeader("Event", back) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            StripedPlaceholder(event.type.lowercase() + " image", height = 180, shape = RoundedCornerShape(22.dp))
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                MicroBadge(event.type, if (event.isMeetup) c.volt.copy(alpha = 0.12f) else c.amber.copy(alpha = 0.18f), if (event.isMeetup) c.accent else c.amberText)
                Spacer(Modifier.width(8.dp))
                Text(event.whenLabel, style = t.labelSm, color = c.accent)
            }
            Spacer(Modifier.height(10.dp))
            Text(event.title, style = t.pageTitle, color = c.txt)
            Spacer(Modifier.height(8.dp))
            Text(event.loc, style = t.bodyLg, color = c.soft)
            Spacer(Modifier.height(18.dp))
            SpotterCard {
                Column(Modifier.padding(15.dp)) {
                    Text("Hosted by ${event.host}", style = t.name, color = c.txt)
                    Spacer(Modifier.height(4.dp))
                    Text("${event.attendees + if (going) 1 else 0} people are going. Members can RSVP and chat with the crew before the session.", style = t.bodySm, color = c.txt2)
                }
            }
            Spacer(Modifier.height(22.dp))
            VoltButton(if (going) "Going" else "RSVP") { vm.toggleGoing(event.id) }
        }
    }
}

@Composable
fun CreateEventOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val canSubmit = vm.newTitle.trim().isNotEmpty() && !vm.isExplicit(vm.newTitle)
    OverlayScaffold(header = { OverlayHeader("Create event", { vm.overlay = "community" }) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            SectionHeading("Type")
            Spacer(Modifier.height(11.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Meetup", "Event").forEach { type -> ChoiceChip(type, vm.newType == type) { vm.newType = type } }
            }
            Spacer(Modifier.height(20.dp))
            SectionHeading("Title")
            Spacer(Modifier.height(11.dp))
            SpotterTextField(vm.newTitle, { vm.newTitle = it }, "Evening bouldering jam")
            Spacer(Modifier.height(20.dp))
            SectionHeading("Community")
            Spacer(Modifier.height(11.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SampleData.communities.forEach { community ->
                    ChoiceChip(community.sport, vm.newSport == community.id) { vm.newSport = community.id; vm.newSub = null }
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SampleData.subGroups[vm.newSport].orEmpty().forEach { sub ->
                    ChoiceChip(sub.name, vm.newSub == sub.id) { vm.newSub = sub.id }
                }
            }
            Spacer(Modifier.height(20.dp))
            SectionHeading("Day and time")
            Spacer(Modifier.height(11.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Wed", "Thu", "Fri", "Sat", "Sun", "Mon").forEachIndexed { index, label -> ChoiceChip(label, vm.newDay == index) { vm.newDay = index } }
            }
            Spacer(Modifier.height(10.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SampleData.slotDefs.forEachIndexed { index, label -> ChoiceChip(label, vm.newTime == index) { vm.newTime = index } }
            }
            Spacer(Modifier.height(22.dp))
            if (vm.newTitle.trim().isNotEmpty() && vm.isExplicit(vm.newTitle)) {
                Text("Please use a safe, community-friendly title.", style = t.bodySm, color = c.danger)
                Spacer(Modifier.height(10.dp))
            }
            VoltButton("Create event", enabled = canSubmit) { vm.submitEvent() }
        }
    }
}

@Composable
fun StartCommunityOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    OverlayScaffold(header = { OverlayHeader("Start community", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            if (vm.commCreated) {
                SuccessBlock("Request sent", "Admins will review the community and contact you if it needs more detail.")
            } else {
                SectionHeading("Community idea")
                Spacer(Modifier.height(11.dp))
                SpotterTextField(vm.commName, { vm.commName = it }, "Padel in Beirut")
                Spacer(Modifier.height(12.dp))
                Text("Official sport communities are approved by admins before they appear in the app.", style = t.bodySm, color = c.txt2)
                Spacer(Modifier.height(22.dp))
                VoltButton("Send to admins", enabled = vm.commName.trim().isNotEmpty() && !vm.isExplicit(vm.commName)) { vm.submitCommunity() }
            }
        }
    }
}

@Composable
fun RequestOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    OverlayScaffold(header = { OverlayHeader("Request", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            if (vm.reqSent) {
                SuccessBlock("Request sent", "Admins will review this request and add it to approvals.")
            } else {
                SectionHeading("Request type")
                Spacer(Modifier.height(11.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Hobby", "Sport", "Community").forEach { type -> ChoiceChip(type, vm.reqType == type) { vm.reqType = type } }
                }
                Spacer(Modifier.height(20.dp))
                SectionHeading("Name")
                Spacer(Modifier.height(11.dp))
                SpotterTextField(vm.reqName, { vm.reqName = it }, "Padel, rowing, photography...")
                Spacer(Modifier.height(12.dp))
                Text("Your request goes to admin approvals before it is added to filters or communities.", style = t.bodySm, color = c.txt2)
                Spacer(Modifier.height(22.dp))
                VoltButton("Send request", enabled = vm.reqName.trim().isNotEmpty() && !vm.isExplicit(vm.reqName)) { vm.submitRequest() }
            }
        }
    }
}

@Composable
private fun SuccessBlock(title: String, body: String) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Spacer(Modifier.height(90.dp))
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(74.dp).clip(RoundedCornerShape(999.dp)).background(c.volt), contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.Check, null, tint = c.ink, modifier = Modifier.size(34.dp))
        }
        Spacer(Modifier.height(18.dp))
        Text(title, style = t.overlayTitle.copy(fontSize = 24.sp), color = c.txt)
        Spacer(Modifier.height(8.dp))
        Text(body, style = t.bodyLg, color = c.txt2, textAlign = TextAlign.Center)
    }
}
