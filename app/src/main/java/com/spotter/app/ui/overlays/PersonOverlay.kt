package com.spotter.app.ui.overlays

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.data.Person
import com.spotter.app.data.SampleData
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.StripeCover
import com.spotter.app.ui.components.VerifiedCheck
import com.spotter.app.ui.theme.SpotterTheme

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun PersonOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val person = SampleData.personById(vm.openId)

    Column(Modifier.fillMaxSize().background(c.bg)) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
        ) {
            // ---- cover ----
            StripeCover(230, c.surface, c.surface2) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(16.dp)
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0x66000000))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { vm.closeOverlay() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.ChevronLeft, "Back", tint = Color(0xFFF2F3F5), modifier = Modifier.size(22.dp))
                }
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 18.dp, end = 18.dp, bottom = 16.dp)
                        .fillMaxWidth(),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Box(
                        modifier = Modifier
                            .size(70.dp)
                            .clip(RoundedCornerShape(18.dp))
                            .background(c.avatarBg)
                            .border(2.dp, c.bg, RoundedCornerShape(18.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(person.initials, style = t.initials.copy(fontSize = 24.sp), color = Color(0xFFF2F3F5))
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f).padding(bottom = 2.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(person.name, style = t.overlayTitle.copy(fontSize = 22.sp), color = c.txt)
                            if (person.isCoach) { Spacer(Modifier.width(6.dp)); VerifiedCheck(17) }
                        }
                        Spacer(Modifier.height(2.dp))
                        Text("${person.sport} · ${person.distanceLabel}", style = t.body, color = c.soft)
                    }
                }
            }

            Column(Modifier.padding(18.dp)) {
                // ---- stats ----
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard("★ ${person.ratingLabel}", person.reviewsLabel, Modifier.weight(1f), c.amberText)
                    StatCard(person.sessions, "sessions", Modifier.weight(1f), c.txt)
                    StatCard(person.reply, "reply time", Modifier.weight(1f), c.accent)
                }
                Spacer(Modifier.height(20.dp))

                SectionHeading("About")
                Spacer(Modifier.height(9.dp))
                Text(person.bio, style = t.bodyLg.copy(lineHeight = 22.sp), color = c.soft)
                Spacer(Modifier.height(22.dp))

                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    person.tags.forEach { tag ->
                        Box(
                            modifier = Modifier
                                .padding(bottom = 8.dp)
                                .clip(RoundedCornerShape(999.dp))
                                .background(c.surface)
                                .border(1.dp, c.line, RoundedCornerShape(999.dp))
                                .padding(horizontal = 13.dp, vertical = 7.dp),
                        ) {
                            Text(tag, style = t.bodySm.copy(fontWeight = FontWeight.W600), color = c.soft)
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))

                SectionHeading("Qualifications")
                Spacer(Modifier.height(11.dp))
                certsFor(person).forEach { (name, meta) ->
                    CertCard(name, meta)
                    Spacer(Modifier.height(10.dp))
                }
                Spacer(Modifier.height(14.dp))

                if (person.isCoach) {
                    SectionHeading("Packages")
                    Spacer(Modifier.height(11.dp))
                    packagesFor(person).forEach { pkg ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(c.surface)
                                .border(1.dp, c.line, RoundedCornerShape(16.dp))
                                .padding(15.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(pkg.name, style = t.name.copy(fontSize = 15.sp), color = c.txt)
                                    if (pkg.tag.isNotEmpty()) {
                                        Spacer(Modifier.width(7.dp))
                                        MicroBadge(pkg.tag, c.volt.copy(alpha = 0.12f), c.accent)
                                    }
                                }
                                Spacer(Modifier.height(3.dp))
                                Text(pkg.sub, style = t.bodySm, color = c.txt2)
                            }
                            Text("$${pkg.price}", style = t.price, color = c.accent)
                        }
                        Spacer(Modifier.height(10.dp))
                    }
                    Spacer(Modifier.height(14.dp))
                }

                SectionHeading("Reviews")
                Spacer(Modifier.height(11.dp))
                SampleData.personReviews.forEach { r ->
                    ReviewCard(r.name, r.whenLabel, r.initials, r.stars, r.text)
                    Spacer(Modifier.height(11.dp))
                }
            }
        }

        // ---- bottom action bar ----
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(c.bg)
                .height(1.dp)
                .background(c.line),
        ) {}
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(c.bg)
                .padding(horizontal = 16.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(11.dp),
        ) {
            SquareIconButton(Icons.Rounded.Flag) { vm.overlay = "report" }
            SquareIconButton(Icons.Rounded.ChatBubbleOutline) { vm.openChat("m1") }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .clip(RoundedCornerShape(15.dp))
                    .background(c.volt)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { if (person.isCoach) vm.openBooking() else vm.closeOverlay() },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (person.isCoach) "Book ${person.firstName}" else "Send training request",
                    style = t.overlayTitle.copy(fontSize = 16.sp), color = c.ink,
                )
            }
        }
    }
}

private fun certsFor(person: Person): List<Pair<String, String>> {
    val sportWord = person.sport.split(" ").first()
    return if (person.isCoach) listOf(
        "Certified $sportWord Coach" to "Lebanese Federation · 2023",
        "First Aid & CPR" to "Red Cross Lebanon · 2025",
    ) else listOf(
        "First Aid & CPR" to "Red Cross Lebanon · 2024",
    )
}

@Composable
private fun StatCard(value: String, label: String, modifier: Modifier, valueColor: Color) {
    val c = SpotterTheme.colors
    Column(
        modifier = modifier
            .clip(SpotterTheme.shapes.input)
            .background(c.surface)
            .border(1.dp, c.line, SpotterTheme.shapes.input)
            .padding(13.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(value, style = SpotterTheme.type.priceSm, color = valueColor)
        Spacer(Modifier.height(3.dp))
        Text(label, style = SpotterTheme.type.caption, color = c.txt2)
    }
}

@Composable
private fun CertCard(name: String, meta: String) {
    val c = SpotterTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(c.surface)
            .border(1.dp, c.line, RoundedCornerShape(16.dp))
            .padding(horizontal = 14.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(11.dp))
                .background(c.volt.copy(alpha = 0.10f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.WorkspacePremium, null, tint = c.accent, modifier = Modifier.size(19.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(name, style = SpotterTheme.type.label, color = c.txt)
            Spacer(Modifier.height(1.dp))
            Text(meta, style = SpotterTheme.type.bodySm, color = c.txt2)
        }
        MicroBadge("VERIFIED", c.volt.copy(alpha = 0.12f), c.accent)
    }
}

@Composable
private fun ReviewCard(name: String, whenLabel: String, initials: String, stars: Int, text: String) {
    val c = SpotterTheme.colors
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(c.surface)
            .border(1.dp, c.line, RoundedCornerShape(16.dp))
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(34.dp).clip(RoundedCornerShape(10.dp)).background(c.avatarBg),
                contentAlignment = Alignment.Center,
            ) {
                Text(initials, style = SpotterTheme.type.initials.copy(fontSize = 13.sp), color = Color(0xFFF2F3F5))
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(name, style = SpotterTheme.type.label, color = c.txt)
                Text(whenLabel, style = SpotterTheme.type.caption, color = c.txt3)
            }
            Text("★".repeat(stars) + "☆".repeat(5 - stars), color = c.amberText, style = SpotterTheme.type.bodySm)
        }
        Spacer(Modifier.height(8.dp))
        Text(text, style = SpotterTheme.type.bodySm.copy(lineHeight = 19.sp), color = c.soft)
    }
}

@Composable
private fun SquareIconButton(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    Box(
        modifier = Modifier
            .size(52.dp)
            .clip(RoundedCornerShape(15.dp))
            .background(c.surface)
            .border(1.dp, c.line, RoundedCornerShape(15.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = c.txt2, modifier = Modifier.size(20.dp))
    }
}
