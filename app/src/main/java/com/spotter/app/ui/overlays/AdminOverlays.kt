package com.spotter.app.ui.overlays

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.OverlayHeader
import com.spotter.app.ui.components.OverlayScaffold
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SpotterCard
import com.spotter.app.ui.components.VoltButton
import com.spotter.app.ui.theme.SpotterTheme

// ---- demo data ported from the prototype's Component class ----

private data class ChatEvidence(val from: String, val text: String, val whenLabel: String)

private data class ReportDef(
    val id: String,
    val by: String,
    val vs: String,
    val reason: String,
    val filed: String,
    val summary: String,
    val chat: List<ChatEvidence>,
    val booking: String,
    val event: String,
)

private val reportDefs = listOf(
    ReportDef(
        "r1", "Alex Morgan", "Sam Okoro", "No-show & abusive messages", "2h ago",
        "12 chat messages · 1 booking · 1 shared event",
        listOf(
            ChatEvidence("Alex Morgan", "I waited 40 minutes at the park. Not cool.", "Mon 9:02 PM"),
            ChatEvidence("Sam Okoro", "Your problem. You wasted my time, loser.", "Mon 9:14 PM"),
        ),
        "Calisthenics session · Mon Jun 29 · marked no-show", "Park Bars Jam · both RSVP'd",
    ),
    ReportDef(
        "r2", "Elena V.", "Yuki T.", "Harassment in chat", "Yesterday",
        "8 chat messages · 1 booking · 1 shared event",
        listOf(ChatEvidence("Yuki T.", "Spot me or don't bother showing up again.", "Tue 7:40 AM")),
        "Strength session · cancelled by Yuki T.", "Heavy Squat Session · both attended",
    ),
    ReportDef(
        "r3", "Nadia R.", "Tariq Aziz", "Payment dispute", "Jun 29",
        "23 chat messages · 2 bookings",
        listOf(ChatEvidence("Nadia R.", "I paid for 5 sessions and only got 3.", "Jun 29")),
        "5-session pack · $135 paid · 3 completed", "No shared events",
    ),
)

private data class BlockedItem(val source: String, val text: String, val whenLabel: String)

private data class FlagDef(
    val id: String,
    val line: String,
    val what: String,
    val whenLabel: String,
    val subject: String,
    val blocked: List<BlockedItem>,
    val history: List<String>,
)

private val flagDefs = listOf(
    FlagDef(
        "sf-demo1", "Account: R. Haddad — paused", "Community name · blocked by filter", "1h ago",
        "R. Haddad",
        listOf(
            BlockedItem("Community name", "After Dark Hookups", "1h ago"),
            BlockedItem("Chat message to M. Saad", "…this app works great as a hookup spot…", "2d ago"),
        ),
        listOf("Member since May 2026 · 3 sessions", "1 previous flag · dismissed", "Reported once by another user"),
    ),
    FlagDef(
        "sf-demo2", "Community: \"Late Night Crew\" — paused", "Event description · blocked by filter", "Yesterday",
        "Community · Late Night Crew",
        listOf(
            BlockedItem("Event description", "…singles only, things get sexy after midnight…", "Yesterday"),
            BlockedItem("Community about text", "…no partners, just fun encounters…", "3d ago"),
        ),
        listOf("Created Jun 2026 · 34 members", "Unofficial community", "2 member reports this week"),
    ),
)

private val loyaltyDefs = listOf(
    "l1" to "Free session with any coach",
    "l2" to "20% off a 5-session pack",
    "l3" to "Free month of coach subscription",
)

private val caseDecisionLabels = mapOf(
    "ban" to "Temporarily banned · 7 days",
    "suspend" to "Permanently suspended",
    "dismiss" to "Report dismissed",
)

// ---- Misconduct reports list ----

@Composable
fun AdminReportsOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    OverlayScaffold(header = { OverlayHeader("Misconduct reports", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            SectionHeading("Safety auto-flags · sexual content")
            Spacer(Modifier.height(11.dp))
            flagDefs.forEach { flag ->
                SafetyFlagCard(vm, flag)
                Spacer(Modifier.height(10.dp))
            }
            Spacer(Modifier.height(14.dp))
            SectionHeading("User reports")
            Spacer(Modifier.height(11.dp))
            reportDefs.forEach { report ->
                UserReportCard(vm, report)
                Spacer(Modifier.height(11.dp))
            }
        }
    }
}

@Composable
private fun SafetyFlagCard(vm: SpotterViewModel, flag: FlagDef) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val verdict = vm.flagVerdicts[flag.id]
    SpotterCard(
        background = c.danger.copy(alpha = 0.05f),
        borderColor = c.danger.copy(alpha = 0.28f),
        onClick = { vm.openSafetyCase(flag.id) },
    ) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(36.dp).clip(RoundedCornerShape(11.dp)).background(c.danger.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Warning, null, tint = c.danger, modifier = Modifier.size(17.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(flag.line, style = t.labelSm, color = c.txt)
                Spacer(Modifier.height(1.dp))
                Text(flag.what, style = t.bodySm, color = c.txt2, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (verdict != null) {
                    Spacer(Modifier.height(7.dp))
                    Text(
                        if (verdict == "suspended") "Permanently suspended" else "Reinstated — pause lifted",
                        style = t.caption.copy(fontWeight = FontWeight.W800),
                        color = if (verdict == "suspended") c.danger else c.accent,
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            Text(flag.whenLabel, style = t.caption, color = c.txt3)
            Icon(Icons.Rounded.ChevronRight, null, tint = c.txt3, modifier = Modifier.size(17.dp))
        }
    }
}

@Composable
private fun UserReportCard(vm: SpotterViewModel, report: ReportDef) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val decision = vm.caseDecisions[report.id]
    SpotterCard(onClick = { vm.openCase(report.id) }) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${report.by} → ${report.vs}", style = t.name, color = c.txt, modifier = Modifier.weight(1f))
                Spacer(Modifier.width(10.dp))
                MicroBadge(
                    decision?.let { caseDecisionLabels[it] } ?: "OPEN",
                    if (decision == null) c.danger.copy(alpha = 0.12f) else c.surface2,
                    when (decision) {
                        null, "suspend" -> c.danger
                        "ban" -> c.amberText
                        else -> c.txt2
                    },
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(report.reason, style = t.bodySm, color = c.txt2)
            Spacer(Modifier.height(5.dp))
            Text("${report.summary} · filed ${report.filed}", style = t.caption, color = c.txt3)
        }
    }
}

// ---- Case review (user report) ----

@Composable
fun AdminCaseOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val report = reportDefs.firstOrNull { it.id == vm.caseId } ?: reportDefs.first()
    val decision = vm.caseDecisions[report.id]
    OverlayScaffold(
        header = {
            OverlayHeader("Case review", vm::backToReports, subtitle = "${report.by} → ${report.vs} · filed ${report.filed}")
        },
    ) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            SpotterCard {
                Column(Modifier.padding(14.dp)) {
                    Text(report.reason, style = t.name, color = c.txt)
                    Spacer(Modifier.height(3.dp))
                    Text("Evidence auto-attached: ${report.summary}", style = t.caption, color = c.txt3)
                }
            }
            Spacer(Modifier.height(20.dp))

            SectionHeading("Chat evidence")
            Spacer(Modifier.height(11.dp))
            report.chat.forEach { message ->
                SpotterCard {
                    Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
                        Row {
                            Text(
                                message.from,
                                style = t.caption.copy(fontWeight = FontWeight.W800),
                                color = if (message.from == report.vs) c.danger else c.txt2,
                                modifier = Modifier.weight(1f),
                            )
                            Text(message.whenLabel, style = t.caption, color = c.txt3)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text("\"${message.text}\"", style = t.body, color = c.soft)
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
            Spacer(Modifier.height(12.dp))

            SectionHeading("Interaction records")
            Spacer(Modifier.height(11.dp))
            RecordRow(Icons.Rounded.CalendarMonth, report.booking)
            Spacer(Modifier.height(8.dp))
            RecordRow(Icons.Rounded.Groups, report.event)
            Spacer(Modifier.height(24.dp))

            if (decision == null) {
                SectionHeading("Action")
                Spacer(Modifier.height(11.dp))
                DecisionButton("Temporary ban · 7 days", c.amber.copy(alpha = 0.14f), c.amberText, c.amber.copy(alpha = 0.35f)) { vm.decideCase("ban") }
                Spacer(Modifier.height(9.dp))
                DecisionButton("Permanent account suspension", c.danger.copy(alpha = 0.12f), c.danger, c.danger.copy(alpha = 0.4f)) { vm.decideCase("suspend") }
                Spacer(Modifier.height(9.dp))
                DecisionButton("Dismiss report", c.surface, c.txt2, c.line) { vm.decideCase("dismiss") }
            } else {
                VerdictBanner(
                    "${caseDecisionLabels[decision]} — both parties notified",
                    if (decision == "suspend") c.danger else if (decision == "ban") c.amberText else c.txt2,
                )
            }
        }
    }
}

// ---- Safety review (auto-flag) ----

@Composable
fun SafetyCaseOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val flag = flagDefs.firstOrNull { it.id == vm.safetyCaseId } ?: flagDefs.first()
    val verdict = vm.flagVerdicts[flag.id]
    OverlayScaffold(
        header = { OverlayHeader("Safety review", vm::backToReports, subtitle = "${flag.subject} · flagged ${flag.whenLabel}") },
    ) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            SpotterCard(background = c.danger.copy(alpha = 0.05f), borderColor = c.danger.copy(alpha = 0.28f)) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(40.dp).clip(RoundedCornerShape(11.dp)).background(c.danger.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.Warning, null, tint = c.danger, modifier = Modifier.size(19.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Sexual content · auto-flagged", style = t.name, color = c.txt)
                        Spacer(Modifier.height(1.dp))
                        Text("Paused pending your decision · content policy §3", style = t.bodySm, color = c.txt2)
                    }
                }
            }
            Spacer(Modifier.height(20.dp))

            SectionHeading("Suspected content")
            Spacer(Modifier.height(11.dp))
            flag.blocked.forEach { item ->
                SpotterCard(borderColor = c.danger.copy(alpha = 0.3f)) {
                    Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
                        Row {
                            Text(item.source, style = t.caption.copy(fontWeight = FontWeight.W800), color = c.danger, modifier = Modifier.weight(1f))
                            Text(item.whenLabel, style = t.caption, color = c.txt3)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text("\"${item.text}\"", style = t.body, color = c.soft)
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
            Spacer(Modifier.height(12.dp))

            SectionHeading("Account record")
            Spacer(Modifier.height(11.dp))
            SpotterCard {
                Column {
                    flag.history.forEachIndexed { index, line ->
                        Row(Modifier.padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(7.dp).clip(RoundedCornerShape(99.dp)).background(c.txt3))
                            Spacer(Modifier.width(10.dp))
                            Text(line, style = t.bodySm, color = c.soft)
                        }
                        if (index < flag.history.lastIndex) Box(Modifier.fillMaxWidth().height(1.dp).background(c.line2))
                    }
                }
            }
            Spacer(Modifier.height(24.dp))

            if (verdict == null) {
                SectionHeading("Decision")
                Spacer(Modifier.height(11.dp))
                DecisionButton("Reinstate — lift the pause", c.volt.copy(alpha = 0.12f), c.accent, c.volt.copy(alpha = 0.35f)) { vm.decideFlag("reinstated") }
                Spacer(Modifier.height(9.dp))
                DecisionButton("Permanent suspension", c.danger.copy(alpha = 0.12f), c.danger, c.danger.copy(alpha = 0.4f)) { vm.decideFlag("suspended") }
            } else {
                VerdictBanner(
                    (if (verdict == "suspended") "Permanently suspended" else "Reinstated — pause lifted") + " — subject notified",
                    if (verdict == "suspended") c.danger else c.accent,
                )
            }
        }
    }
}

// ---- Promotions ----

@Composable
fun AdminPromosOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    OverlayScaffold(header = { OverlayHeader("Promotions", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            SectionHeading("Discount")
            Spacer(Modifier.height(11.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(10, 15, 20, 30).forEach { pctVal ->
                    Box(Modifier.weight(1f)) {
                        PctChip("$pctVal%", vm.promoPct == pctVal) { vm.promoPct = pctVal; vm.promoCode = null }
                    }
                }
            }
            Spacer(Modifier.height(22.dp))
            SectionHeading("Audience")
            Spacer(Modifier.height(11.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("All users", "New users", "Inactive 30d").forEach { aud ->
                    Box(Modifier.weight(1f)) {
                        AudChip(aud, vm.promoAud == aud) { vm.promoAud = aud; vm.promoCode = null }
                    }
                }
            }
            Spacer(Modifier.height(22.dp))
            VoltButton("Generate promo code", enabled = true) { vm.genPromo() }
            Spacer(Modifier.height(24.dp))

            SectionHeading("Active promos")
            Spacer(Modifier.height(11.dp))
            vm.promoCode?.let { code ->
                PromoCard(code, "${vm.promoPct}% off · ${vm.promoAud} · just created", fresh = true)
                Spacer(Modifier.height(10.dp))
            }
            PromoCard("SUMMER15", "15% off single sessions · ends Jul 15", fresh = false)
        }
    }
}

@Composable
private fun PctChip(label: String, active: Boolean, onTap: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(13.dp))
            .background(if (active) c.volt else c.surface)
            .border(1.dp, if (active) c.volt else c.line, RoundedCornerShape(13.dp))
            .clickable { onTap() }
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = t.price, color = if (active) c.ink else c.txt2)
    }
}

@Composable
private fun AudChip(label: String, active: Boolean, onTap: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(999.dp))
            .background(if (active) c.volt else c.surface)
            .border(1.dp, if (active) c.volt else c.line, RoundedCornerShape(999.dp))
            .clickable { onTap() }
            .padding(vertical = 11.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = t.labelSm, color = if (active) c.ink else c.txt2)
    }
}

@Composable
private fun PromoCard(code: String, sub: String, fresh: Boolean) {
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

// ---- Loyalty offers ----

@Composable
fun AdminLoyaltyOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    OverlayScaffold(header = { OverlayHeader("Loyalty offers", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            Text(
                "Users earn points per completed session and event. Set the point cost of each reward.",
                style = t.body, color = c.txt2,
            )
            Spacer(Modifier.height(18.dp))
            loyaltyDefs.forEach { (key, label) ->
                SpotterCard {
                    Column(Modifier.padding(15.dp)) {
                        Text(label, style = t.name, color = c.txt)
                        Spacer(Modifier.height(12.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Point cost", style = t.bodySm, color = c.txt3, modifier = Modifier.weight(1f))
                            PtsStepButton(Icons.Rounded.Remove) { vm.loyaltyAdjust(key, -100) }
                            Text(
                                "${vm.loyaltyPts[key]} pts",
                                style = t.price,
                                color = c.accent,
                                modifier = Modifier.width(84.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            )
                            PtsStepButton(Icons.Rounded.Add) { vm.loyaltyAdjust(key, 100) }
                        }
                    }
                }
                Spacer(Modifier.height(11.dp))
            }
        }
    }
}

@Composable
private fun PtsStepButton(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    Box(
        modifier = Modifier.size(32.dp).clip(RoundedCornerShape(10.dp)).background(c.surface2).clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = c.txt2, modifier = Modifier.size(14.dp))
    }
}

// ---- shared bits ----

@Composable
private fun RecordRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = c.accent, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(11.dp))
            Text(label, style = t.bodySm, color = c.soft)
        }
    }
}

@Composable
private fun DecisionButton(label: String, bg: Color, fg: Color, borderColor: Color, onClick: () -> Unit) {
    val t = SpotterTheme.type
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(bg)
            .border(1.dp, borderColor, RoundedCornerShape(14.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = t.labelSm.copy(fontWeight = FontWeight.W800), color = fg)
    }
}

@Composable
private fun VerdictBanner(label: String, fg: Color) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Box(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(c.surface2).padding(15.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = t.labelSm.copy(fontWeight = FontWeight.W800), color = fg, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}
