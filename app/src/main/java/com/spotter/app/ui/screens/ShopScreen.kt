package com.spotter.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.data.SampleData
import com.spotter.app.data.Shop
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.AvatarTile
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.SegOption
import com.spotter.app.ui.components.SegmentedControl
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SpotterCard
import com.spotter.app.ui.components.StarRating
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun ShopScreen(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp)
            .padding(top = 20.dp, bottom = 26.dp),
    ) {
        Text("Partner sports and hobby stores", style = t.bodySm, color = c.txt3)
        Spacer(Modifier.height(3.dp))
        Text("Shop", style = t.pageTitle, color = c.txt)
        Spacer(Modifier.height(7.dp))
        Text("Buy gear in-app from nearby partner stores.", style = t.body, color = c.txt2)

        Spacer(Modifier.height(18.dp))
        SegmentedControl(
            options = listOf(SegOption("list", "List"), SegOption("map", "Map")),
            selectedKey = vm.shopView,
            onSelect = { vm.shopView = it },
            fontSize = 13,
            itemPadding = 8,
        )

        Spacer(Modifier.height(20.dp))
        if (vm.shopView == "map") {
            ShopMap(vm)
        } else {
            SectionHeading("Closest first")
            Spacer(Modifier.height(11.dp))
            SampleData.shops.sortedBy { it.dist }.forEach { shop ->
                ShopListCard(shop, onOpen = { vm.openShop(shop.id) })
                Spacer(Modifier.height(11.dp))
            }
        }

        Spacer(Modifier.height(13.dp))
        PartnerPromo(onOpen = {
            vm.shopRegDone = false
            vm.overlay = "shopRegister"
        })
    }
}

@Composable
private fun ShopListCard(shop: Shop, onOpen: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(onClick = onOpen) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            AvatarTile(shop.initials, shop.tint)
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(shop.name, style = t.name, color = c.txt, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Spacer(Modifier.width(7.dp))
                    MicroBadge("Partner", c.volt.copy(alpha = 0.10f), c.accent)
                }
                Spacer(Modifier.height(3.dp))
                Text(shop.category, style = t.bodySm, color = c.txt2)
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    StarRating(shop.rating, shop.reviews)
                    Spacer(Modifier.width(8.dp))
                    Text(shop.deal, style = t.caption, color = c.txt3)
                }
            }
            Spacer(Modifier.width(10.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(shop.distLabel, style = t.priceSm, color = c.accent)
                Text("away", style = t.caption, color = c.txt3)
            }
        }
    }
}

@Composable
private fun ShopMap(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val nearest = SampleData.shops.minBy { it.dist }
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .height(520.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(c.mapBg)
            .border(1.dp, c.line, RoundedCornerShape(22.dp))
            .drawBehind {
                val step = 40.dp.toPx()
                var x = 0f
                while (x < size.width) {
                    drawLine(c.grid, Offset(x, 0f), Offset(x, size.height), 1f)
                    x += step
                }
                var y = 0f
                while (y < size.height) {
                    drawLine(c.grid, Offset(0f, y), Offset(size.width, y), 1f)
                    y += step
                }
            },
    ) {
        SampleData.shops.forEach { shop ->
            Box(
                modifier = Modifier
                    .offset(x = maxWidth * (shop.pinLeft / 100f) - 22.dp, y = maxHeight * (shop.pinTop / 100f) - 22.dp)
                    .clickable { vm.openShop(shop.id) },
            ) {
                AvatarTile(shop.initials, shop.tint, size = 44, radius = 13, fontSize = 14)
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .offset(y = 14.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(c.nav)
                        .border(1.dp, c.line, RoundedCornerShape(999.dp))
                        .padding(horizontal = 7.dp, vertical = 2.dp),
                ) {
                    Text(shop.distLabel, style = t.microBadge, color = c.accent)
                }
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(14.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(c.surface)
                .border(1.dp, c.line, RoundedCornerShape(18.dp))
                .clickable { vm.openShop(nearest.id) }
                .padding(14.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AvatarTile(nearest.initials, nearest.tint, size = 48, radius = 14, fontSize = 15)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(nearest.name, style = t.name, color = c.txt)
                    Text("${nearest.category} - ${nearest.deal}", style = t.bodySm, color = c.txt2)
                }
                Text(nearest.distLabel, style = t.priceSm, color = c.accent)
            }
        }
    }
}

@Composable
private fun PartnerPromo(onOpen: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(background = c.volt.copy(alpha = 0.10f), borderColor = c.volt.copy(alpha = 0.22f)) {
        Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(c.volt.copy(alpha = 0.16f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.Storefront, null, tint = c.accent, modifier = Modifier.size(23.dp))
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text("Own a sports or hobby shop?", style = t.name, color = c.txt)
                Spacer(Modifier.height(3.dp))
                Text("Apply to sell in-app and reach local training crews.", style = t.bodySm, color = c.txt2)
            }
            Spacer(Modifier.width(10.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(c.volt)
                    .clickable { onOpen() }
                    .padding(horizontal = 14.dp, vertical = 9.dp),
            ) {
                Text("Be a Shop", style = t.bodySm.copy(fontWeight = FontWeight.W800, fontSize = 12.sp), color = c.ink)
            }
        }
    }
}
