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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.data.Expense
import com.spotter.app.data.HistoryEntry
import com.spotter.app.data.Message
import com.spotter.app.data.SampleData
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.state.fmtMoney
import com.spotter.app.state.pct
import com.spotter.app.ui.components.AvatarTile
import com.spotter.app.ui.components.ChoiceChip
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.OverlayHeader
import com.spotter.app.ui.components.OverlayScaffold
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SpotterCard
import com.spotter.app.ui.components.SpotterTextField
import com.spotter.app.ui.components.VoltButton
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun ConversationOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val chat = SampleData.chatById(vm.chatId)
    OverlayScaffold(
        header = { OverlayHeader(chat.name, vm::closeOverlay) },
        bottomBar = {
            Column(Modifier.background(c.bg)) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(c.line))
                Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.weight(1f).clip(SpotterTheme.shapes.input).background(c.surface).border(1.dp, c.line, SpotterTheme.shapes.input).padding(horizontal = 14.dp, vertical = 13.dp),
                    ) {
                        Text("Message ${chat.name.split(" ").first()}...", style = t.body, color = c.txt3)
                    }
                    Spacer(Modifier.width(10.dp))
                    Box(Modifier.size(46.dp).clip(RoundedCornerShape(14.dp)).background(c.volt), contentAlignment = Alignment.Center) {
                        Icon(Icons.AutoMirrored.Rounded.Send, null, tint = c.ink, modifier = Modifier.size(20.dp))
                    }
                }
            }
        },
    ) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 18.dp)) {
            SampleData.messages.forEach { message ->
                MessageBubble(message)
                Spacer(Modifier.height(10.dp))
            }
        }
    }
}

@Composable
private fun MessageBubble(message: Message) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (message.me) Arrangement.End else Arrangement.Start) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.78f)
                .clip(RoundedCornerShape(18.dp))
                .background(if (message.me) c.volt else c.surface)
                .border(1.dp, if (message.me) c.volt else c.line, RoundedCornerShape(18.dp))
                .padding(horizontal = 14.dp, vertical = 11.dp),
        ) {
            Text(message.text, style = t.body, color = if (message.me) c.ink else c.soft)
        }
    }
}

@Composable
fun NotificationsOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    OverlayScaffold(header = { OverlayHeader("Notifications", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            vm.acctNotif?.let { notif ->
                NotificationCard(notif.title, notif.body, notif.whenLabel, highlighted = true)
                Spacer(Modifier.height(11.dp))
            }
            NotificationCard("Daily plan briefing", "Strength session at 6:30 PM, plus two community events near you.", "Today", highlighted = vm.dailyPlanOn)
            Spacer(Modifier.height(11.dp))
            NotificationCard("Booking confirmed", "Marcus confirmed your 5-session pack for July.", "Yesterday", highlighted = false)
            Spacer(Modifier.height(11.dp))
            NotificationCard("New partner nearby", "Jordan K. is looking for a tempo run partner within 400 m.", "2 days ago", highlighted = false)
        }
    }
}

@Composable
private fun NotificationCard(title: String, body: String, whenLabel: String, highlighted: Boolean) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(background = if (highlighted) c.volt.copy(alpha = 0.10f) else c.surface, borderColor = if (highlighted) c.volt.copy(alpha = 0.20f) else c.line) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            Box(Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(if (highlighted) c.volt.copy(alpha = 0.14f) else c.surface2), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Notifications, null, tint = if (highlighted) c.accent else c.txt2, modifier = Modifier.size(19.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(title, style = t.name, color = c.txt, modifier = Modifier.weight(1f))
                    Text(whenLabel, style = t.caption, color = c.txt3)
                }
                Spacer(Modifier.height(4.dp))
                Text(body, style = t.bodySm, color = c.txt2)
            }
        }
    }
}

@Composable
fun AdminApprovalsOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    OverlayScaffold(header = { OverlayHeader("Approvals", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            ApprovalCard(
                "Hobby request", "Padel", "Sport · requested by 214 users",
                decision = vm.hobbyDecisions["padel"], approveLabel = "Approve", declineLabel = "Reject",
                onApprove = { vm.hobbyDecisions["padel"] = "Approved" },
                onDecline = { vm.hobbyDecisions["padel"] = "Rejected" },
            )
            Spacer(Modifier.height(11.dp))
            ApprovalCard(
                "Hobby request", "Salsa", "Hobby · requested by 89 users",
                decision = vm.hobbyDecisions["salsa"], approveLabel = "Approve", declineLabel = "Reject",
                onApprove = { vm.hobbyDecisions["salsa"] = "Approved" },
                onDecline = { vm.hobbyDecisions["salsa"] = "Rejected" },
            )
            Spacer(Modifier.height(11.dp))
            ApprovalCard(
                "Official community", "Chess community", "640 members · applied for official status",
                decision = vm.hobbyDecisions["chess-off"], approveLabel = "Approve", declineLabel = "Reject",
                onApprove = { vm.hobbyDecisions["chess-off"] = "Approved" },
                onDecline = { vm.hobbyDecisions["chess-off"] = "Rejected" },
            )
            if (vm.shopRegDoneName.isNotBlank()) {
                Spacer(Modifier.height(11.dp))
                ApprovalCard(
                    "Shop partnership", vm.shopRegDoneName, vm.shopRegDoneMeta.ifBlank { "Contact details pending" },
                    decision = vm.shopDecisions[vm.shopRegDoneName], approveLabel = "Open deal", declineLabel = "Decline",
                    onApprove = { vm.shopDecisions[vm.shopRegDoneName] = "Deal opened — onboarding sent" },
                    onDecline = { vm.shopDecisions[vm.shopRegDoneName] = "Declined" },
                )
            }
            Spacer(Modifier.height(18.dp))
            Text("Shop requests submitted from the Be a Shop flow appear here with contact metadata.", style = t.bodySm, color = c.txt3)
        }
    }
}

@Composable
private fun ApprovalCard(
    type: String,
    title: String,
    detail: String,
    decision: String?,
    approveLabel: String,
    declineLabel: String,
    onApprove: () -> Unit,
    onDecline: () -> Unit,
) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val pending = decision == null
    val rejected = decision == "Rejected" || decision == "Declined"
    SpotterCard {
        Column(Modifier.padding(15.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                MicroBadge(type, if (pending) c.amber.copy(alpha = 0.18f) else c.volt.copy(alpha = 0.12f), if (pending) c.amberText else c.accent)
                Spacer(Modifier.weight(1f))
                Text(decision ?: "Pending", style = t.caption.copy(fontWeight = FontWeight.W800), color = if (pending) c.amberText else if (rejected) c.danger else c.accent)
            }
            Spacer(Modifier.height(10.dp))
            Text(title, style = t.name, color = c.txt)
            Spacer(Modifier.height(4.dp))
            Text(detail, style = t.bodySm, color = c.txt2)
            if (pending) {
                Spacer(Modifier.height(13.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                    SmallAction(approveLabel, true, onApprove)
                    SmallAction(declineLabel, false, onDecline)
                }
            }
        }
    }
}

@Composable
fun AdminAccountingOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val effective = vm.effective()
    OverlayScaffold(
        header = {
            OverlayHeader("Accounting", vm::closeOverlay) {
                Text("History", style = t.labelSm, color = c.accent, modifier = Modifier.clickable { vm.overlay = "acctHistory" })
            }
        },
    ) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SectionHeading("This month", modifier = Modifier.weight(1f))
                MicroBadge("Admins only", c.volt.copy(alpha = 0.12f), c.accent)
            }
            Spacer(Modifier.height(11.dp))
            SpotterCard {
                Column(Modifier.padding(15.dp)) {
                    MoneyRow("Revenue", fmtMoney(vm.revenue), positive = true)
                    Spacer(Modifier.height(10.dp))
                    vm.acctExpItems.forEach { expense ->
                        ExpenseRow(expense) { vm.openExpenseEdit(expense) }
                        Spacer(Modifier.height(8.dp))
                    }
                    Row(Modifier.fillMaxWidth().clip(SpotterTheme.shapes.input).clickable { vm.openExpenseNew() }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Add, null, tint = c.accent, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Add expense", style = t.labelSm, color = c.accent)
                    }
                    Spacer(Modifier.height(8.dp))
                    Box(Modifier.fillMaxWidth().height(1.dp).background(c.line))
                    Spacer(Modifier.height(12.dp))
                    MoneyRow("Net profit", fmtMoney(vm.net), positive = true, large = true)
                }
            }

            Spacer(Modifier.height(22.dp))
            SectionHeading("Margins per transaction")
            Spacer(Modifier.height(11.dp))
            SampleData.marginDefs.forEach { (key, label) ->
                val changed = effective.margins[key] != vm.acctMargins[key]
                PercentEditRow(
                    label = label,
                    raw = vm.acctRawText("margins", key),
                    valueLabel = if (changed) "was ${pct(vm.acctMargins[key])}" else pct(effective.margins[key]),
                    changed = changed,
                    enabled = vm.acctEditable,
                    onMinus = { vm.acctAdjust("margins", key, -0.5) },
                    onPlus = { vm.acctAdjust("margins", key, 0.5) },
                    onRaw = { vm.acctEditRaw("margins", key, it) },
                )
                Spacer(Modifier.height(10.dp))
            }

            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                SectionHeading("Admin profit shares", modifier = Modifier.weight(1f))
                Text("Total ${pct(vm.sharesTotal())}", style = t.labelSm, color = if (vm.sharesOk()) c.accent else c.danger)
            }
            Spacer(Modifier.height(11.dp))
            SampleData.shareDefs.forEach { (key, label) ->
                val changed = effective.shares[key] != vm.acctShares[key]
                PercentEditRow(
                    label = "$label - ${vm.payoutLabel(key)}",
                    raw = vm.acctRawText("shares", key),
                    valueLabel = if (changed) "was ${pct(vm.acctShares[key])}" else pct(effective.shares[key]),
                    changed = changed,
                    enabled = vm.acctEditable,
                    onMinus = { vm.acctAdjust("shares", key, -1.0) },
                    onPlus = { vm.acctAdjust("shares", key, 1.0) },
                    onRaw = { vm.acctEditRaw("shares", key, it) },
                )
                Spacer(Modifier.height(10.dp))
            }

            vm.acctProposal?.let { proposal ->
                Spacer(Modifier.height(12.dp))
                SpotterCard(background = c.amber.copy(alpha = 0.10f), borderColor = c.amber.copy(alpha = 0.25f)) {
                    Column(Modifier.padding(15.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MicroBadge("Pending", c.amber.copy(alpha = 0.18f), c.amberText)
                            Spacer(Modifier.width(8.dp))
                            Text("${proposal.approvals.size} of 3 approvals", style = t.labelSm, color = c.amberText)
                        }
                        Spacer(Modifier.height(10.dp))
                        proposal.lines.forEach { line ->
                            Text(line, style = t.bodySm, color = c.soft)
                            Spacer(Modifier.height(5.dp))
                        }
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            proposal.approvals.forEach { name -> MicroBadge(name, c.surface2, c.txt2) }
                        }
                        Spacer(Modifier.height(13.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                            SampleData.allAdmins.filterNot { it in proposal.approvals }.forEach { admin ->
                                SmallAction("Approve as ${admin.split(" ").first()}", true) { vm.approveAs(admin) }
                            }
                            SmallAction("Withdraw", false) { vm.cancelProposal() }
                        }
                    }
                }
            }

            vm.acctAppliedNote?.let { note ->
                Spacer(Modifier.height(12.dp))
                SpotterCard(background = c.volt.copy(alpha = 0.10f), borderColor = c.volt.copy(alpha = 0.22f)) {
                    Text(note, style = t.bodySm, color = c.accent, modifier = Modifier.padding(14.dp))
                }
            }

            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.weight(1f)) {
                    VoltButton("Propose changes", enabled = vm.acctDirty && vm.sharesOk() && vm.acctEditable) { vm.submitProposal() }
                }
                Box(Modifier.weight(1f)) {
                    SmallWideAction("Discard", enabled = vm.acctDirty && vm.acctEditable) { vm.discardDraft() }
                }
            }
        }
    }
}

@Composable
private fun MoneyRow(label: String, value: String, positive: Boolean, large: Boolean = false) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = if (large) t.name else t.bodySm, color = c.txt2, modifier = Modifier.weight(1f))
        Text(value, style = if (large) t.price else t.labelSm, color = if (positive) c.accent else c.danger)
    }
}

@Composable
private fun ExpenseRow(expense: Expense, onOpen: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Row(Modifier.fillMaxWidth().clip(SpotterTheme.shapes.input).clickable { onOpen() }.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(expense.label, style = t.bodySm, color = c.soft)
            Text(expense.recur, style = t.caption, color = c.txt3)
        }
        Text("-${fmtMoney(expense.amt)}", style = t.labelSm, color = c.danger)
    }
}

@Composable
private fun PercentEditRow(label: String, raw: String, valueLabel: String, changed: Boolean, enabled: Boolean, onMinus: () -> Unit, onPlus: () -> Unit, onRaw: (String) -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(background = if (enabled) c.surface else c.surface2) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(label, style = t.labelSm, color = c.txt, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(3.dp))
                Text(valueLabel, style = t.caption, color = if (changed) c.accent else c.txt3)
            }
            StepButton(Icons.Rounded.Remove, enabled, onMinus)
            Spacer(Modifier.width(7.dp))
            SpotterTextField(
                raw, onRaw, "0",
                modifier = Modifier.width(76.dp),
                keyboardType = KeyboardType.Decimal,
                textColor = if (changed) c.accent else Color.Unspecified,
            )
            Spacer(Modifier.width(7.dp))
            StepButton(Icons.Rounded.Add, enabled, onPlus)
        }
    }
}

@Composable
private fun StepButton(icon: androidx.compose.ui.graphics.vector.ImageVector, enabled: Boolean, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    Box(
        modifier = Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(if (enabled) c.surface2 else c.mono.copy(alpha = 0.12f)).clickable(enabled = enabled) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = if (enabled) c.accent else c.txt3, modifier = Modifier.size(18.dp))
    }
}

@Composable
fun AccountingExpenseOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val editing = vm.acctExpId != null
    OverlayScaffold(header = { OverlayHeader(if (editing) "Edit expense" else "Add expense", { vm.overlay = "adminAccounting" }) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            SectionHeading("Name")
            Spacer(Modifier.height(11.dp))
            SpotterTextField(vm.acctExpName, { vm.acctExpName = it }, "Servers and infrastructure")
            Spacer(Modifier.height(20.dp))
            SectionHeading("Amount")
            Spacer(Modifier.height(11.dp))
            SpotterTextField(vm.acctExpAmt, { vm.acctExpAmt = it }, "0.00", keyboardType = KeyboardType.Decimal)
            Spacer(Modifier.height(20.dp))
            SectionHeading("Recurrence")
            Spacer(Modifier.height(11.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SampleData.recurOptions.forEach { recur -> ChoiceChip(recur, vm.acctExpRecur == recur) { vm.acctExpRecur = recur } }
            }
            Spacer(Modifier.height(9.dp))
            Text(SampleData.recurHints[vm.acctExpRecur].orEmpty(), style = SpotterTheme.type.bodySm, color = c.txt3)
            Spacer(Modifier.height(24.dp))
            VoltButton("Save expense", enabled = vm.canSaveExpense) { vm.saveExpense() }
            if (editing) {
                Spacer(Modifier.height(12.dp))
                SmallWideAction("Delete expense", danger = true, enabled = true) { vm.deleteExpense() }
            }
        }
    }
}

@Composable
fun AccountingHistoryOverlay(vm: SpotterViewModel) {
    OverlayScaffold(header = { OverlayHeader("History", { vm.overlay = "adminAccounting" }) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            vm.acctHistory.forEach { entry ->
                HistoryCard(entry)
                Spacer(Modifier.height(11.dp))
            }
        }
    }
}

@Composable
private fun HistoryCard(entry: HistoryEntry) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            Box(Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(c.surface2), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.History, null, tint = c.accent, modifier = Modifier.size(19.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(entry.title, style = t.name, color = c.txt, modifier = Modifier.weight(1f))
                    Text(entry.whenLabel, style = t.caption, color = c.txt3)
                }
                Spacer(Modifier.height(4.dp))
                Text(entry.detail, style = t.bodySm, color = c.txt2)
                Spacer(Modifier.height(4.dp))
                Text(entry.meta, style = t.caption, color = c.txt3)
            }
        }
    }
}

@Composable
fun ReportOverlay(vm: SpotterViewModel) {
    OverlayScaffold(header = { OverlayHeader("Report", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(Modifier.height(80.dp))
            Box(Modifier.size(74.dp).clip(RoundedCornerShape(999.dp)).background(SpotterTheme.colors.volt), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Check, null, tint = SpotterTheme.colors.ink, modifier = Modifier.size(34.dp))
            }
            Spacer(Modifier.height(18.dp))
            Text("Report queued", style = SpotterTheme.type.overlayTitle.copy(fontSize = 24.sp), color = SpotterTheme.colors.txt)
            Spacer(Modifier.height(8.dp))
            Text("A moderator will review this profile from the admin console.", style = SpotterTheme.type.bodyLg, color = SpotterTheme.colors.txt2, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun SmallAction(text: String, primary: Boolean, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Box(
        modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(if (primary) c.volt else c.surface2).clickable { onClick() }.padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Text(text, style = t.caption.copy(fontWeight = FontWeight.W800), color = if (primary) c.ink else c.txt2)
    }
}

@Composable
private fun SmallWideAction(text: String, enabled: Boolean = true, danger: Boolean = false, onClick: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Box(
        modifier = Modifier.fillMaxWidth().height(52.dp).clip(SpotterTheme.shapes.button).background(if (!enabled) c.surface2 else if (danger) c.danger.copy(alpha = 0.14f) else c.surface2).clickable(enabled = enabled) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text(text, style = t.overlayTitle.copy(fontSize = 16.sp), color = if (!enabled) c.txt3 else if (danger) c.danger else c.txt2)
    }
}

