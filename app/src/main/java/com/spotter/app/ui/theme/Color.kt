package com.spotter.app.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/**
 * Full semantic color model ported from the prototype's CSS `:root` (dark) and
 * `[data-theme="light"]` variable sets. Names mirror the design tokens.
 */
@Immutable
data class SpotterColors(
    val isDark: Boolean,
    val bg: Color,
    val nav: Color,
    val surface: Color,
    val surface2: Color,
    val them: Color,
    val line: Color,
    val line2: Color,
    val txt: Color,
    val strong: Color,
    val soft: Color,
    val txt2: Color,
    val txt3: Color,
    val mono: Color,
    val mapBg: Color,
    val grid: Color,
    /** Text/link/price accent — darkens in light theme for contrast. */
    val accent: Color,
    /** Brand volt — constant across themes (button fills, active toggles). */
    val volt: Color,
    val amber: Color,
    val amberText: Color,
    val danger: Color,
    val avatarBg: Color,
    /** Page radial-gradient stops (top → bottom). */
    val pageTop: Color,
    val pageBottom: Color,
) {
    /** Button-on-volt ink text — constant. */
    val ink: Color get() = Color(0xFF0D0E11)
}

private fun white(alpha: Float) = Color(0xFFFFFFFF).copy(alpha = alpha)
private fun black(alpha: Float) = Color(0xFF000000).copy(alpha = alpha)

val DarkColors = SpotterColors(
    isDark = true,
    bg = Color(0xFF0D0E11),
    nav = Color(0xFF101216),
    surface = Color(0xFF16181D),
    surface2 = Color(0xFF1C1F26),
    them = Color(0xFF1C1F26),
    line = white(0.07f),
    line2 = white(0.05f),
    txt = Color(0xFFF2F3F5),
    strong = Color(0xFFE7E9EC),
    soft = Color(0xFFC5CAD2),
    txt2 = Color(0xFF9BA1AC),
    txt3 = Color(0xFF6B7280),
    mono = Color(0xFF3A3F47),
    mapBg = Color(0xFF0A0B0D),
    grid = white(0.035f),
    accent = Color(0xFFC6F24E),
    volt = Color(0xFFC6F24E),
    amber = Color(0xFFF2C84B),
    amberText = Color(0xFFF2C84B),
    danger = Color(0xFFE8543F),
    avatarBg = Color(0xFF262B33),
    pageTop = Color(0xFF15171C),
    pageBottom = Color(0xFF08090B),
)

val LightColors = SpotterColors(
    isDark = false,
    bg = Color(0xFFF4F5F7),
    nav = Color(0xFFFFFFFF),
    surface = Color(0xFFFFFFFF),
    surface2 = Color(0xFFEBEDF1),
    them = Color(0xFFE9EBEF),
    line = black(0.09f),
    line2 = black(0.06f),
    txt = Color(0xFF15171C),
    strong = Color(0xFF22252B),
    soft = Color(0xFF3F454D),
    txt2 = Color(0xFF5A616B),
    txt3 = Color(0xFF8A909A),
    mono = Color(0xFFAEB4BE),
    mapBg = Color(0xFFE6E8ED),
    grid = black(0.05f),
    accent = Color(0xFF5E8A00),
    volt = Color(0xFFC6F24E),
    amber = Color(0xFFF2C84B),
    amberText = Color(0xFF9A7400),
    danger = Color(0xFFE8543F),
    avatarBg = Color(0xFF565E6B),
    pageTop = Color(0xFFE3E5EB),
    pageBottom = Color(0xFFC7CAD2),
)
