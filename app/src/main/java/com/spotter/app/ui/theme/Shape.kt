package com.spotter.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Immutable
import androidx.compose.ui.unit.dp

/** Corner-radius tokens from the handoff "Shape & spacing" section. */
@Immutable
data class SpotterShapes(
    val card: RoundedCornerShape = RoundedCornerShape(18.dp),
    val input: RoundedCornerShape = RoundedCornerShape(14.dp),
    val button: RoundedCornerShape = RoundedCornerShape(15.dp),
    val buttonSm: RoundedCornerShape = RoundedCornerShape(13.dp),
    val avatar: RoundedCornerShape = RoundedCornerShape(15.dp),
    val avatarLg: RoundedCornerShape = RoundedCornerShape(16.dp),
    val avatarXl: RoundedCornerShape = RoundedCornerShape(17.dp),
    val pill: RoundedCornerShape = RoundedCornerShape(999.dp),
    val segmentItem: RoundedCornerShape = RoundedCornerShape(11.dp),
    val chipSm: RoundedCornerShape = RoundedCornerShape(10.dp),
)

/** Common spacing constants (dp). */
object Spacing {
    const val screenH = 18
    const val cardPad = 14
    const val listGap = 11
}
