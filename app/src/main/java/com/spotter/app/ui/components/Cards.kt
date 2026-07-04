package com.spotter.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.spotter.app.data.AdDef
import com.spotter.app.data.Person
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun VerifiedCheck(size: Int = 14) {
    Icon(
        Icons.Rounded.Verified,
        contentDescription = "Verified",
        tint = SpotterTheme.colors.volt,
        modifier = Modifier.size(size.dp),
    )
}

/** Standard person row card (Discover list, search results). */
@Composable
fun PersonListCard(person: Person, onOpen: () -> Unit, modifier: Modifier = Modifier) {
    val c = SpotterTheme.colors
    SpotterCard(modifier = modifier.fillMaxWidth(), onClick = onOpen) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AvatarTile(person.initials, c.avatarBg)
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text(person.name, style = SpotterTheme.type.name, color = c.txt)
                Spacer(Modifier.size(2.dp))
                Text(person.metaLabel, style = SpotterTheme.type.bodySm, color = c.txt2)
                Spacer(Modifier.size(6.dp))
                StarRating(person.rating, person.reviews)
            }
            Spacer(Modifier.width(10.dp))
            if (person.isCoach) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(person.priceLabel, style = SpotterTheme.type.priceSm, color = c.accent)
                    Text("per session", style = SpotterTheme.type.caption, color = c.txt3)
                }
            } else {
                MicroBadge(person.level, bg = c.volt.copy(alpha = 0.10f), fg = c.accent)
            }
        }
    }
}

/** Featured/boosted person card — amber gradient + border + BOOSTED badge. */
@Composable
fun BoostedCard(person: Person, onOpen: () -> Unit, modifier: Modifier = Modifier) {
    val c = SpotterTheme.colors
    val grad = Brush.linearGradient(
        listOf(c.amber.copy(alpha = 0.10f), c.amber.copy(alpha = 0.02f)),
    )
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(SpotterTheme.shapes.card)
            .background(grad)
            .border(1.dp, c.amber.copy(alpha = 0.30f), SpotterTheme.shapes.card)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onOpen() }
            .padding(14.dp),
    ) {
        MicroBadge(
            "BOOSTED",
            bg = c.amber.copy(alpha = 0.14f),
            fg = c.amberText,
            modifier = Modifier.align(Alignment.TopEnd),
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            AvatarTile(person.initials, c.avatarBg, size = 58, radius = 16, fontSize = 19)
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(person.name, style = SpotterTheme.type.name, color = c.txt)
                    Spacer(Modifier.width(5.dp))
                    VerifiedCheck()
                }
                Spacer(Modifier.size(2.dp))
                Text("${person.sport} · ${person.distanceLabel}", style = SpotterTheme.type.bodySm, color = c.txt2)
                Spacer(Modifier.size(6.dp))
                StarRating(person.rating, person.reviews)
            }
            Spacer(Modifier.width(10.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(person.priceLabel, style = SpotterTheme.type.price, color = c.accent)
                Text("per session", style = SpotterTheme.type.caption, color = c.txt3)
            }
        }
    }
}

/** Sponsored AD card — dismissable, taps through to sponsor. */
@Composable
fun AdCard(ad: AdDef, onOpen: () -> Unit, onHide: () -> Unit, modifier: Modifier = Modifier) {
    val c = SpotterTheme.colors
    SpotterCard(modifier = modifier.fillMaxWidth(), onClick = onOpen) {
        Box(Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.align(Alignment.TopEnd),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                MicroBadge("AD", bg = c.surface2, fg = c.txt3)
                Spacer(Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { onHide() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Close, contentDescription = "Dismiss ad", tint = c.txt3, modifier = Modifier.size(12.dp))
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                AvatarTile(ad.logo, ad.tint, size = 54, radius = 15)
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) {
                    Text(ad.brand, style = SpotterTheme.type.name, color = c.txt, modifier = Modifier.padding(end = 44.dp))
                    Spacer(Modifier.size(2.dp))
                    Text(ad.headline, style = SpotterTheme.type.bodySm, color = c.txt2, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Spacer(Modifier.size(6.dp))
                    Text("Why this ad? ${ad.why}", style = SpotterTheme.type.caption, color = c.txt3, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}
