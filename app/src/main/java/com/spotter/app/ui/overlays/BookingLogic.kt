package com.spotter.app.ui.overlays

import com.spotter.app.data.Person
import com.spotter.app.data.SampleData
import kotlin.math.roundToInt

data class Pkg(val key: Int, val name: String, val sub: String, val price: Int, val tag: String)

fun packagesFor(person: Person): List<Pkg> {
    val bp = person.price ?: 40
    return listOf(
        Pkg(1, "Single session", "1 session · 60 min", bp, ""),
        Pkg(2, "5-session pack", "5 sessions · save 10%", (bp * 5 * 0.9).roundToInt(), "Popular"),
        Pkg(3, "Monthly plan", "12 sessions / month", (bp * 12 * 0.78).roundToInt(), "Best value"),
    )
}

enum class CellState { BLANK, PAST, FULL, SELECTED, TODAY, WEEKEND, NORMAL }

data class CalCell(val day: Int?, val state: CellState, val selectable: Boolean)

val weekdayLabels = listOf("S", "M", "T", "W", "T", "F", "S")
private val dowShort = listOf("SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT")

fun calendarCells(person: Person, bookDay: Int): List<CalCell> {
    val full = SampleData.fullDaysByCoach[person.id] ?: emptyList()
    val cells = mutableListOf<CalCell>()
    repeat(SampleData.firstDow) { cells.add(CalCell(null, CellState.BLANK, false)) }
    for (d in 1..SampleData.daysInMonth) {
        val dow = (SampleData.firstDow + d - 1) % 7
        val isWeekend = dow == 0 || dow == 6
        val past = d < SampleData.todayNum
        val isFull = full.contains(d)
        val state = when {
            past -> CellState.PAST
            isFull -> CellState.FULL
            bookDay == d -> CellState.SELECTED
            d == SampleData.todayNum -> CellState.TODAY
            isWeekend -> CellState.WEEKEND
            else -> CellState.NORMAL
        }
        cells.add(CalCell(d, state, !past && !isFull))
    }
    return cells
}

data class Slot(val label: String, val idx: Int, val taken: Boolean, val selected: Boolean)

fun slotsFor(person: Person, bookDay: Int, bookSlot: Int): Pair<List<Slot>, Int> {
    val seed = person.id.last().code + bookDay * 3
    val taken = setOf(seed % 6, (seed * 2 + 1) % 6)
    var eff = bookSlot
    if (taken.contains(eff)) eff = (0..5).first { !taken.contains(it) }
    val slots = SampleData.slotDefs.mapIndexed { i, label ->
        Slot(label, i, taken.contains(i), eff == i)
    }
    return slots to eff
}

fun selDow(bookDay: Int): String = dowShort[(SampleData.firstDow + bookDay - 1) % 7]
fun selNum(bookDay: Int): String = bookDay.toString().padStart(2, '0')
