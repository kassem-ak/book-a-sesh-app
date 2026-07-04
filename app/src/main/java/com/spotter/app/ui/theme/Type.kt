package com.spotter.app.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.spotter.app.R

@OptIn(ExperimentalTextApi::class)
private fun archivo(weight: Int) = Font(
    R.font.archivo_variable,
    FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

@OptIn(ExperimentalTextApi::class)
private fun hanken(weight: Int) = Font(
    R.font.hanken_grotesk_variable,
    FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

/** Display / headings / numbers. */
val Archivo = FontFamily(
    archivo(500), archivo(600), archivo(700), archivo(800), archivo(900),
)

/** Body text. */
val Hanken = FontFamily(
    hanken(400), hanken(500), hanken(600), hanken(700), hanken(800),
)

/**
 * Named text styles matching the handoff typography spec. Sizes are in sp to
 * respect user font scaling; the prototype's px map ~1:1 to sp at default scale.
 */
@Immutable
data class SpotterType(
    val pageTitle: TextStyle = TextStyle(
        fontFamily = Archivo, fontWeight = FontWeight.W800, fontSize = 27.sp,
        lineHeight = 28.sp, letterSpacing = (-0.5).sp,
    ),
    val overlayTitle: TextStyle = TextStyle(
        fontFamily = Archivo, fontWeight = FontWeight.W800, fontSize = 19.sp,
    ),
    val price: TextStyle = TextStyle(
        fontFamily = Archivo, fontWeight = FontWeight.W800, fontSize = 17.sp,
    ),
    val priceSm: TextStyle = TextStyle(
        fontFamily = Archivo, fontWeight = FontWeight.W800, fontSize = 15.sp,
    ),
    val sectionHeading: TextStyle = TextStyle(
        fontFamily = Archivo, fontWeight = FontWeight.W800, fontSize = 12.sp,
        letterSpacing = 1.4.sp,
    ),
    val initials: TextStyle = TextStyle(
        fontFamily = Archivo, fontWeight = FontWeight.W800, fontSize = 18.sp,
    ),
    val bodyLg: TextStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.W400, fontSize = 15.sp),
    val body: TextStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.W400, fontSize = 14.sp),
    val bodySm: TextStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.W400, fontSize = 13.sp),
    val name: TextStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.W700, fontSize = 16.sp),
    val label: TextStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.W700, fontSize = 14.sp),
    val labelSm: TextStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.W700, fontSize = 13.sp),
    val microBadge: TextStyle = TextStyle(
        fontFamily = Archivo, fontWeight = FontWeight.W800, fontSize = 9.sp,
        letterSpacing = 0.7.sp,
    ),
    val navLabel: TextStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.W600, fontSize = 10.sp),
    val caption: TextStyle = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.W400, fontSize = 11.sp),
    val mono: TextStyle = TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.W500, fontSize = 11.sp),
)
