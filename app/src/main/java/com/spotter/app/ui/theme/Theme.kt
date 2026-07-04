package com.spotter.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.core.view.WindowCompat

private val LocalSpotterColors = staticCompositionLocalOf { DarkColors }
private val LocalSpotterType = staticCompositionLocalOf { SpotterType() }
private val LocalSpotterShapes = staticCompositionLocalOf { SpotterShapes() }

/** Accessor object, e.g. `SpotterTheme.colors.volt`. */
object SpotterTheme {
    val colors: SpotterColors
        @Composable @ReadOnlyComposable get() = LocalSpotterColors.current
    val type: SpotterType
        @Composable @ReadOnlyComposable get() = LocalSpotterType.current
    val shapes: SpotterShapes
        @Composable @ReadOnlyComposable get() = LocalSpotterShapes.current
}

@Composable
fun SpotterTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !darkTheme
        }
    }

    // A minimal Material3 scheme so stock M3 components (ripples, text selection)
    // pick sane colors; the app draws its own surfaces from SpotterColors.
    val m3 = if (darkTheme) {
        darkColorScheme(
            primary = colors.volt,
            onPrimary = colors.ink,
            background = colors.bg,
            surface = colors.surface,
            onBackground = colors.txt,
            onSurface = colors.txt,
        )
    } else {
        lightColorScheme(
            primary = colors.volt,
            onPrimary = colors.ink,
            background = colors.bg,
            surface = colors.surface,
            onBackground = colors.txt,
            onSurface = colors.txt,
        )
    }

    CompositionLocalProvider(
        LocalSpotterColors provides colors,
        LocalSpotterType provides SpotterType(),
        LocalSpotterShapes provides SpotterShapes(),
        LocalContentColor provides colors.txt,
    ) {
        MaterialTheme(
            colorScheme = m3,
            typography = defaultM3Typography(),
            content = content,
        )
    }
}

/** Route Material3's default text through Hanken so any stray M3 Text matches. */
private fun defaultM3Typography(): Typography {
    val base = Typography()
    fun TextStyle.hk() = copy(fontFamily = Hanken)
    return base.copy(
        displayLarge = base.displayLarge.hk(), displayMedium = base.displayMedium.hk(),
        displaySmall = base.displaySmall.hk(), headlineLarge = base.headlineLarge.hk(),
        headlineMedium = base.headlineMedium.hk(), headlineSmall = base.headlineSmall.hk(),
        titleLarge = base.titleLarge.hk(), titleMedium = base.titleMedium.hk(),
        titleSmall = base.titleSmall.hk(), bodyLarge = base.bodyLarge.hk(),
        bodyMedium = base.bodyMedium.hk(), bodySmall = base.bodySmall.hk(),
        labelLarge = base.labelLarge.hk(), labelMedium = base.labelMedium.hk(),
        labelSmall = base.labelSmall.hk(),
    )
}
