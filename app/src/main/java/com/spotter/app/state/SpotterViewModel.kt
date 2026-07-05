package com.spotter.app.state

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.spotter.app.data.CalProvider
import com.spotter.app.data.Expense
import com.spotter.app.data.HistoryEntry
import com.spotter.app.data.Margins
import com.spotter.app.data.MarginsShares
import com.spotter.app.data.Notif
import com.spotter.app.data.Proposal
import com.spotter.app.data.Role
import com.spotter.app.data.SampleData
import com.spotter.app.data.Shares
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToLong

/** Central app state + behavior, mirroring the prototype's `Component` class. */
class SpotterViewModel : ViewModel() {

    // ---- top-level ----
    var tab by mutableStateOf("discover")
    var role by mutableStateOf(Role.USER)
    var isDark by mutableStateOf(true)
    var overlay by mutableStateOf<String?>(null)

    // ---- discover / shop ----
    var mode by mutableStateOf("coaches")
    var sport by mutableStateOf("All")
    var sortBy by mutableStateOf("rating")
    var discoverView by mutableStateOf("cards")
    var shopView by mutableStateOf("list")
    var sportMenu by mutableStateOf(false)

    // ---- selected ids ----
    var openId by mutableStateOf("c1")
    var shopId by mutableStateOf("s1")
    var chatId by mutableStateOf("m1")
    var communityId by mutableStateOf("running")
    var eventId by mutableStateOf("ev1")
    var returnTo by mutableStateOf<String?>(null)

    // ---- cart ----
    val cart = mutableStateMapOf<String, Int>()

    // ---- booking ----
    var bookDay by mutableStateOf(9)
    var bookSlot by mutableStateOf(4)
    var bookPkg by mutableStateOf(2)
    var booked by mutableStateOf(false)
    var bookingChange by mutableStateOf(false)

    // ---- prefs ----
    var notifSeen by mutableStateOf(false)
    var pushOn by mutableStateOf(true)
    var dailyPlanOn by mutableStateOf(true)
    var calSyncOn by mutableStateOf(false)
    var calProvider by mutableStateOf(CalProvider.GOOGLE)

    // ---- ads ----
    val adsHidden = mutableStateMapOf<String, Boolean>()

    // ---- shop registration ----
    var shopRegName by mutableStateOf("")
    var shopRegCat by mutableStateOf<String?>(null)
    var shopRegCatOther by mutableStateOf("")
    var shopRegCatMenu by mutableStateOf(false)
    var shopRegPhone by mutableStateOf("")
    var shopRegEmail by mutableStateOf("")
    var shopRegMeans by mutableStateOf<String?>(null)
    var shopRegTime by mutableStateOf("")
    var shopRegDone by mutableStateOf(false)
    var shopRegDoneName by mutableStateOf("")
    var shopRegDoneCat by mutableStateOf<String?>(null)
    var shopRegDoneMeta by mutableStateOf("")
    val shopDecisions = mutableStateMapOf<String, String>()

    // ---- communities ----
    val joinedCommunities = mutableStateListOf("running", "strength")
    val joinedSubs = mutableStateListOf("run-downtown", "str-iron")
    val goingEvents = mutableStateListOf("ev1", "ev3")

    fun toggleCommunity(id: String) { if (id in joinedCommunities) joinedCommunities.remove(id) else joinedCommunities.add(id) }
    fun toggleSub(id: String) { if (id in joinedSubs) joinedSubs.remove(id) else joinedSubs.add(id) }
    fun toggleGoing(id: String) { if (id in goingEvents) goingEvents.remove(id) else goingEvents.add(id) }

    // ---- community + event creation ----
    val customEvents = mutableStateListOf<com.spotter.app.data.Event>()
    var newType by mutableStateOf("Meetup")
    var newSport by mutableStateOf("running")
    var newSub by mutableStateOf<String?>(null)
    var newDay by mutableStateOf(3)
    var newTime by mutableStateOf(1)
    var newTitle by mutableStateOf("")
    var evtCreated by mutableStateOf(false)
    var commName by mutableStateOf("")
    var commCreated by mutableStateOf(false)
    var reqName by mutableStateOf("")
    var reqType by mutableStateOf("Hobby")
    var reqSent by mutableStateOf(false)

    fun isExplicit(text: String): Boolean {
        val t = text.lowercase()
        return listOf("sex", "sexual", "sexy", "nude", "naked", "nsfw", "xxx", "porn", "escort",
            "erotic", "onlyfans", "hookup", "fetish").any { t.contains(it) }
    }

    fun openStartCommunity() { overlay = "startCommunity"; commCreated = false; commName = "" }
    fun openRequest() { overlay = "request"; reqSent = false; reqName = ""; reqType = "Hobby" }
    fun openCreateEvent() { overlay = "createEvent"; evtCreated = false; newTitle = ""; newType = "Meetup"; newSport = communityId; newSub = null; newDay = 3; newTime = 1 }
    fun backToCommunityFromEvent() { overlay = "community" }

    fun submitEvent() {
        if (newTitle.trim().isEmpty() || isExplicit(newTitle)) return
        val days = listOf("WED" to "02", "THU" to "03", "FRI" to "04", "SAT" to "05", "SUN" to "06", "MON" to "07")
        val (dow, num) = days[newDay]
        val time = SampleData.slotDefs[newTime]
        val ev = com.spotter.app.data.Event(
            id = "cust${System.currentTimeMillis()}", communityId = newSport, subId = newSub,
            type = newType, title = newTitle.trim(), whenLabel = "$dow $num · $time",
            loc = "TBD", attendees = 1, host = "Alex Morgan",
        )
        customEvents.add(0, ev)
        goingEvents.add(ev.id)
        evtCreated = true
        overlay = "community"
    }

    fun submitCommunity() {
        if (commName.trim().isEmpty() || isExplicit(commName)) return
        commCreated = true
    }

    fun submitRequest() {
        if (reqName.trim().isEmpty() || isExplicit(reqName)) return
        reqSent = true
    }

    fun allEvents(): List<com.spotter.app.data.Event> = customEvents + SampleData.events

    // ---- cart ops ----
    fun toggleCartItem(key: String, price: Int) { if (cart.containsKey(key)) cart.remove(key) else cart[key] = price }
    val cartCount: Int get() = cart.size
    val cartTotal: Int get() = cart.values.sum()

    // ---- navigation helpers ----
    fun openPerson(id: String) { openId = id; overlay = "person" }
    fun openBooking() { overlay = "booking"; booked = false }
    fun backToPerson() { overlay = "person"; booked = false }
    fun confirmBooking() { booked = true }
    fun goToBookings() { overlay = "bookings"; booked = false }
    fun openBookings() { overlay = "bookings" }
    fun openShop(id: String) { shopId = id; overlay = "shop" }
    fun openChat(id: String) { chatId = id; overlay = "conversation" }
    fun openCommunity(id: String) { communityId = id; sportMenu = false; overlay = "community" }
    fun openEvent(id: String, from: String?) { eventId = id; returnTo = from; overlay = "event" }
    fun openNotifs() { overlay = "notifications"; notifSeen = true }
    fun closeOverlay() { overlay = null }

    // ================= Accounting =================
    var acctMargins by mutableStateOf(Margins(12.0, 8.0, 15.0))
    var acctShares by mutableStateOf(Shares(40.0, 30.0, 30.0))
    var acctDraft by mutableStateOf<MarginsShares?>(null)
    var acctProposal by mutableStateOf<Proposal?>(null)
    var acctAppliedNote by mutableStateOf<String?>(null)
    var acctNotif by mutableStateOf<Notif?>(null)
    val acctEdits = mutableStateMapOf<String, String>()
    val acctExpItems = mutableStateListOf<Expense>().apply { addAll(SampleData.initialExpenses) }
    val acctHistory = mutableStateListOf<HistoryEntry>().apply { addAll(SampleData.initialHistory) }

    var acctExpId by mutableStateOf<String?>(null)
    var acctExpName by mutableStateOf("")
    var acctExpAmt by mutableStateOf("")
    var acctExpRecur by mutableStateOf("Monthly")

    val revenue: Double get() = SampleData.revenue
    val expTotal: Double get() = acctExpItems.sumOf { it.amt }
    val net: Double get() = round2(revenue - expTotal)

    private fun current() = MarginsShares(acctMargins, acctShares)
    fun effective(): MarginsShares = acctDraft ?: current()
    val acctDirty: Boolean get() = acctDraft != null && acctDraft != current()
    val acctEditable: Boolean get() = acctProposal == null
    fun sharesTotal(): Double = with(effective().shares) { alex + rima + karim }
    fun sharesOk(): Boolean = abs(sharesTotal() - 100) < 0.005

    fun acctAdjust(group: String, key: String, delta: Double) {
        if (acctProposal != null) return
        val base = acctDraft ?: current()
        acctDraft = if (group == "margins") {
            base.copy(margins = base.margins.with(key, clampRound(base.margins[key] + delta)))
        } else {
            base.copy(shares = base.shares.with(key, clampRound(base.shares[key] + delta)))
        }
        acctEdits.remove("$group:$key")
    }

    fun acctEditRaw(group: String, key: String, text: String) {
        if (acctProposal != null) return
        acctEdits["$group:$key"] = text
        val num = text.toDoubleOrNull()
        if (num != null && num in 0.0..100.0) {
            val base = acctDraft ?: current()
            val r = round2(num)
            acctDraft = if (group == "margins") base.copy(margins = base.margins.with(key, r))
            else base.copy(shares = base.shares.with(key, r))
        }
    }

    fun acctRawText(group: String, key: String): String =
        acctEdits["$group:$key"] ?: numStr(effective().let { if (group == "margins") it.margins[key] else it.shares[key] })

    private fun chgLines(from: MarginsShares, to: MarginsShares): List<String> {
        val lines = mutableListOf<String>()
        SampleData.marginDefs.forEach { (k, label) ->
            if (from.margins[k] != to.margins[k]) lines.add("$label: ${pct(from.margins[k])} → ${pct(to.margins[k])}")
        }
        SampleData.shareDefs.forEach { (k, label) ->
            if (from.shares[k] != to.shares[k]) lines.add("$label share: ${pct(from.shares[k])} → ${pct(to.shares[k])}")
        }
        return lines
    }

    fun submitProposal() {
        if (!acctDirty || !sharesOk() || acctProposal != null) return
        val d = acctDraft ?: return
        acctProposal = Proposal(d, chgLines(current(), d), listOf("Alex Morgan (you)"))
        acctDraft = null; acctEdits.clear(); acctAppliedNote = null
    }

    fun discardDraft() { acctDraft = null; acctEdits.clear() }

    fun approveAs(name: String) {
        val prop = acctProposal ?: return
        if (name in prop.approvals) return
        val approvals = prop.approvals + name
        if (approvals.size >= 3) {
            val marginChanged = SampleData.marginDefs.any { (k, _) -> acctMargins[k] != prop.to.margins[k] }
            acctMargins = prop.to.margins
            acctShares = prop.to.shares
            acctProposal = null
            acctHistory.add(0, HistoryEntry(
                "Just now",
                if (marginChanged) "Margins & shares updated" else "Profit shares updated",
                prop.lines.joinToString(" · "),
                "Approved by 3 admins" + if (marginChanged) " · affected users notified" else " · internal only",
            ))
            acctAppliedNote = "Approved by 3 admins — change is live." +
                if (marginChanged) " Affected users were notified." else " Internal change · no users affected."
            if (marginChanged) {
                acctNotif = Notif("Just now", "Platform fees updated",
                    prop.lines.filter { !it.contains(" share:") }.joinToString(" · ") +
                        ". Applies to all new transactions starting now.")
                notifSeen = false
            }
        } else {
            acctProposal = prop.copy(approvals = approvals)
        }
    }

    fun cancelProposal() { acctProposal = null }

    fun openExpenseNew() {
        acctExpId = null; acctExpName = ""; acctExpAmt = ""; acctExpRecur = "Monthly"; overlay = "acctExpense"
    }

    fun openExpenseEdit(e: Expense) {
        acctExpId = e.id; acctExpName = e.label; acctExpAmt = numStr(e.amt); acctExpRecur = e.recur; overlay = "acctExpense"
    }

    val canSaveExpense: Boolean
        get() = acctExpName.trim().length > 1 && (acctExpAmt.toDoubleOrNull()?.let { it > 0 } == true)

    fun saveExpense() {
        if (!canSaveExpense) return
        val amt = round2(acctExpAmt.toDouble())
        val id = acctExpId ?: "e${System.currentTimeMillis()}"
        val item = Expense(id, acctExpName.trim(), amt, acctExpRecur)
        val editing = acctExpId != null
        if (editing) {
            val idx = acctExpItems.indexOfFirst { it.id == acctExpId }
            if (idx >= 0) acctExpItems[idx] = item
        } else acctExpItems.add(item)
        acctHistory.add(0, HistoryEntry("Just now", if (editing) "Expense updated" else "Expense added",
            "${item.label}: ${fmtMoney(amt)} (${item.recur})", "By Alex Morgan (you)"))
        overlay = "adminAccounting"
    }

    fun deleteExpense() {
        val e = acctExpItems.firstOrNull { it.id == acctExpId }
        if (e != null) {
            acctExpItems.remove(e)
            acctHistory.add(0, HistoryEntry("Just now", "Expense removed",
                "${e.label}: ${fmtMoney(e.amt)} (${e.recur})", "By Alex Morgan (you)"))
        }
        overlay = "adminAccounting"
    }

    fun payoutLabel(key: String): String = fmtMoney((net * effective().shares[key] / 100).roundToLong().toDouble()) + " / mo"

    // ================= Admin: approvals =================
    val hobbyDecisions = mutableStateMapOf<String, String>() // padel/salsa/chess-off -> Approved | Rejected

    // ================= Admin: misconduct reports =================
    val caseDecisions = mutableStateMapOf<String, String>() // report id -> ban | suspend | dismiss
    var caseId by mutableStateOf("r1")
    val flagVerdicts = mutableStateMapOf<String, String>() // flag id -> reinstated | suspended
    var safetyCaseId by mutableStateOf("sf-demo1")

    fun openCase(id: String) { caseId = id; overlay = "adminCase" }
    fun openSafetyCase(id: String) { safetyCaseId = id; overlay = "safetyCase" }
    fun backToReports() { overlay = "adminReports" }
    fun decideCase(verdict: String) { caseDecisions[caseId] = verdict }
    fun decideFlag(verdict: String) { flagVerdicts[safetyCaseId] = verdict }

    // ================= Admin: promotions =================
    var promoPct by mutableStateOf(15)
    var promoAud by mutableStateOf("All users")
    var promoCode by mutableStateOf<String?>(null)

    fun genPromo() {
        val suffix = List(4) { "ABCDEFGHJKMNPQRSTUVWXYZ23456789".random() }.joinToString("")
        promoCode = "SPOT$promoPct-$suffix"
    }

    // ================= Admin: loyalty =================
    val loyaltyPts = mutableStateMapOf("l1" to 500, "l2" to 900, "l3" to 1500)
    fun loyaltyAdjust(key: String, delta: Int) { loyaltyPts[key] = max(100, (loyaltyPts[key] ?: 100) + delta) }

    // ================= Coach role =================
    val myCerts = mutableStateListOf(Cert("ct1", "First Aid & CPR", "Red Cross Lebanon", "2025", verified = true))
    fun addCert(name: String) { myCerts.add(Cert("ct${System.currentTimeMillis()}", name, "Awaiting verification", "2026", verified = false)) }
    fun removeCert(id: String) { myCerts.removeAll { it.id == id } }

    val apptDecisions = mutableStateMapOf<String, String>() // a1/a2 -> Approved | Declined
    var coachRate by mutableStateOf(0)

    // -- weekly schedule editor --
    var schedDay by mutableStateOf("THU")
    var addTimeIdx by mutableStateOf(4)
    val schedule = mutableStateMapOf(
        "MON" to listOf("6:30 AM", "8:00 AM", "5:30 PM", "6:30 PM"),
        "TUE" to listOf("6:30 AM", "8:00 AM", "5:30 PM", "6:30 PM"),
        "WED" to listOf("6:30 AM", "5:30 PM", "6:30 PM"),
        "THU" to listOf("6:30 AM", "8:00 AM", "5:30 PM", "6:30 PM"),
        "FRI" to listOf("6:30 AM", "8:00 AM", "5:30 PM"),
        "SAT" to listOf("8:00 AM", "12:00 PM"),
        "SUN" to listOf(),
    )

    val schedTimes: List<String> = buildList {
        for (h in 5..22) for (m in listOf("00", "30")) {
            val h12 = if (h % 12 == 0) 12 else h % 12
            add("$h12:$m ${if (h < 12) "AM" else "PM"}")
        }
    }

    private fun byTime(slots: List<String>) = slots.sortedBy { schedTimes.indexOf(it) }
    val daySlots: List<String> get() = byTime(schedule[schedDay].orEmpty())
    val addTimeLabel: String get() = schedTimes.getOrElse(addTimeIdx) { schedTimes.first() }
    val canAddSlot: Boolean get() = addTimeLabel !in schedule[schedDay].orEmpty()
    fun addSlot() { if (canAddSlot) schedule[schedDay] = byTime(schedule[schedDay].orEmpty() + addTimeLabel) }
    fun removeSlot(t: String) { schedule[schedDay] = schedule[schedDay].orEmpty().filter { it != t } }
    fun setDayOff() { schedule[schedDay] = emptyList() }

    // -- packages editor --
    val myPackages = mutableStateListOf(
        CoachPkg("pk1", 1, 45), CoachPkg("pk2", 5, 203), CoachPkg("pk3", 12, 421),
    )
    var newPkgSessions by mutableStateOf(10)
    var newPkgPrice by mutableStateOf(380)

    fun updPkg(id: String, dSessions: Int = 0, dPrice: Int = 0) {
        val idx = myPackages.indexOfFirst { it.id == id }
        if (idx < 0) return
        val p = myPackages[idx]
        myPackages[idx] = p.copy(sessions = max(1, p.sessions + dSessions), price = max(5, p.price + dPrice))
    }

    fun removePkg(id: String) { myPackages.removeAll { it.id == id } }
    fun addPackage() { myPackages.add(CoachPkg("pk${System.currentTimeMillis()}", newPkgSessions, newPkgPrice)) }

    // -- coach promos --
    var cPromoPct by mutableStateOf(15)
    var cPromoCode by mutableStateOf<String?>(null)

    fun genCoachPromo() {
        val suffix = List(4) { "ABCDEFGHJKMNPQRSTUVWXYZ23456789".random() }.joinToString("")
        cPromoCode = "ALEX-$suffix-$cPromoPct"
    }

    // ---- number formatting (mirrors JS behavior) ----
    private fun round2(x: Double): Double = (x * 100).roundToLong() / 100.0
    private fun clampRound(x: Double): Double = round2(max(0.0, min(100.0, x)))
}

data class Cert(val id: String, val name: String, val issuer: String, val year: String, val verified: Boolean)

data class CoachPkg(val id: String, val sessions: Int, val price: Int) {
    val name: String get() = if (sessions == 1) "Single session" else "$sessions-session pack"
    val per: String get() = "$${price / sessions} per session · 60 min each"
}

fun numStr(d: Double): String =
    if (d == d.toLong().toDouble()) d.toLong().toString()
    else d.toBigDecimal().stripTrailingZeros().toPlainString()

fun pct(d: Double): String = numStr(d) + "%"

fun fmtMoney(n: Double): String {
    val nf = NumberFormat.getNumberInstance(Locale.US)
    nf.maximumFractionDigits = 2
    return "$" + nf.format(n)
}
