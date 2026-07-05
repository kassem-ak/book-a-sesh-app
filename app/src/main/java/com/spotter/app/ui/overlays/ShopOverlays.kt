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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.LocalOffer
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.data.Product
import com.spotter.app.data.SampleData
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.AvatarTile
import com.spotter.app.ui.components.ChoiceChip
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.OverlayHeader
import com.spotter.app.ui.components.OverlayScaffold
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SpotterCard
import com.spotter.app.ui.components.SpotterTextField
import com.spotter.app.ui.components.StarRating
import com.spotter.app.ui.components.StripedPlaceholder
import com.spotter.app.ui.components.VoltButton
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun ShopStorefrontOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val shop = SampleData.shopById(vm.shopId)

    OverlayScaffold(
        header = { OverlayHeader("Partner store", vm::closeOverlay) },
        bottomBar = {
            if (vm.cartCount > 0) {
                Column(Modifier.background(c.bg)) {
                    Box(Modifier.fillMaxWidth().height(1.dp).background(c.line))
                    Box(Modifier.padding(horizontal = 16.dp, vertical = 13.dp)) {
                        VoltButton("Checkout - ${vm.cartCount} items - $${vm.cartTotal}") {}
                    }
                }
            }
        },
    ) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            SpotterCard {
                Column(Modifier.padding(15.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AvatarTile(shop.initials, shop.tint, size = 64, radius = 17, fontSize = 22)
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(shop.name, style = t.overlayTitle, color = c.txt, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Spacer(Modifier.width(7.dp))
                                MicroBadge("Partner store", c.volt.copy(alpha = 0.12f), c.accent)
                            }
                            Spacer(Modifier.height(4.dp))
                            Text("${shop.category} - ${shop.distLabel} away", style = t.bodySm, color = c.txt2)
                            Spacer(Modifier.height(6.dp))
                            StarRating(shop.rating, shop.reviews)
                        }
                    }
                    Spacer(Modifier.height(15.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(SpotterTheme.shapes.input)
                            .background(c.volt.copy(alpha = 0.10f))
                            .border(1.dp, c.volt.copy(alpha = 0.18f), SpotterTheme.shapes.input)
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Rounded.LocalOffer, null, tint = c.accent, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(9.dp))
                        Text("${shop.deal} applied at in-app checkout", style = t.labelSm, color = c.accent)
                    }
                }
            }

            Spacer(Modifier.height(22.dp))
            SectionHeading("Popular items")
            Spacer(Modifier.height(11.dp))
            shop.products.chunked(2).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                    row.forEach { product ->
                        ProductCard(shop.id, product, vm, Modifier.weight(1f))
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
                Spacer(Modifier.height(11.dp))
            }
        }
    }
}

@Composable
private fun ProductCard(shopId: String, product: Product, vm: SpotterViewModel, modifier: Modifier) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val key = "$shopId:${product.name}"
    val added = vm.cart.containsKey(key)
    SpotterCard(modifier = modifier) {
        Column(Modifier.padding(12.dp)) {
            StripedPlaceholder(product.ph, height = 92)
            Spacer(Modifier.height(9.dp))
            Text(product.name, style = t.labelSm, color = c.txt, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("$${product.price}", style = t.priceSm, color = c.accent, modifier = Modifier.weight(1f))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(if (added) c.volt else c.surface2)
                        .clickable { vm.toggleCartItem(key, product.price) }
                        .padding(horizontal = 10.dp, vertical = 7.dp),
                ) {
                    Text(if (added) "Added" else "Add", style = t.caption.copy(fontWeight = FontWeight.W800), color = if (added) c.ink else c.txt2)
                }
            }
        }
    }
}

@Composable
fun ShopRegisterOverlay(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    val canSubmit = vm.shopRegName.trim().isNotEmpty() && (vm.shopRegPhone.trim().isNotEmpty() || vm.shopRegEmail.trim().isNotEmpty())

    OverlayScaffold(header = { OverlayHeader("Be a Shop", vm::closeOverlay) }) {
        Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 22.dp)) {
            if (vm.shopRegDone) {
                Spacer(Modifier.height(90.dp))
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier.size(74.dp).clip(RoundedCornerShape(999.dp)).background(c.volt),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Rounded.Check, null, tint = c.ink, modifier = Modifier.size(34.dp))
                        }
                        Spacer(Modifier.height(18.dp))
                        Text("Request sent", style = t.overlayTitle.copy(fontSize = 24.sp), color = c.txt)
                        Spacer(Modifier.height(8.dp))
                        Text("Admins will contact ${vm.shopRegDoneName.ifEmpty { "your shop" }} to open the partner deal.", style = t.bodyLg, color = c.txt2, textAlign = TextAlign.Center)
                    }
                }
                return@Column
            }

            SectionHeading("Shop details")
            Spacer(Modifier.height(11.dp))
            SpotterTextField(vm.shopRegName, { vm.shopRegName = it }, "Shop name")
            Spacer(Modifier.height(10.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SampleData.shopCategories.forEach { cat ->
                    ChoiceChip(cat, vm.shopRegCat == cat) { vm.shopRegCat = cat }
                }
            }
            if (vm.shopRegCat == "Other") {
                Spacer(Modifier.height(10.dp))
                SpotterTextField(vm.shopRegCatOther, { vm.shopRegCatOther = it }, "What does your shop sell?")
            }

            Spacer(Modifier.height(20.dp))
            SectionHeading("Contact")
            Spacer(Modifier.height(11.dp))
            SpotterTextField(vm.shopRegPhone, { vm.shopRegPhone = it }, "Phone", keyboardType = KeyboardType.Phone)
            Spacer(Modifier.height(10.dp))
            SpotterTextField(vm.shopRegEmail, { vm.shopRegEmail = it }, "Email", keyboardType = KeyboardType.Email)
            Spacer(Modifier.height(12.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Phone call", "WhatsApp", "Email", "In-app chat").forEach { means ->
                    ChoiceChip(means, vm.shopRegMeans == means) { vm.shopRegMeans = means }
                }
            }
            Spacer(Modifier.height(10.dp))
            SpotterTextField(vm.shopRegTime, { vm.shopRegTime = it }, "Best time to contact")

            Spacer(Modifier.height(22.dp))
            VoltButton("Send request to admins", enabled = canSubmit) {
                vm.shopRegDoneName = vm.shopRegName.trim()
                vm.shopRegDoneCat = vm.shopRegCat
                vm.shopRegDoneMeta = listOf(vm.shopRegPhone, vm.shopRegEmail, vm.shopRegMeans, vm.shopRegTime)
                    .filterNotNull()
                    .filter { it.isNotBlank() }
                    .joinToString(" - ")
                vm.shopRegDone = true
            }
        }
    }
}
