import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, Chip, Field, Icon, MicroBadge, Row, SectionHeading, Stars, StripedPlaceholder, VoltButton } from '../components/ui';
import { formatDistanceKm } from '../lib/geo';
import * as D from '../state/sampleData';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function ShopStorefrontOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const sh = s.shopById(s.shopId);
  const count = s.cartCount();
  const distanceLabel = formatDistanceKm((sh as { distanceKm?: number | null }).distanceKm);

  if (s.shopOrderDone) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Partner store" onBack={s.closeOverlay} />}>
        <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 70 }}>
          <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={34} color={c.ink} />
          </View>
          <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>Order placed</Text>
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>Your order was sent to {sh.name}. The store will prepare it for pickup or delivery.</Text>
        </View>
      </OverlayScaffold>
    );
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title="Partner store" onBack={s.closeOverlay} />}
      bottomBar={
        count > 0 ? (
          <View style={{ padding: 16, backgroundColor: c.bg }}>
            <VoltButton
              height={56}
              label={`Checkout · ${count} item${count > 1 ? 's' : ''} · $${s.cartTotal()}`}
              onPress={s.checkoutCart}
              busy={s.writeBusy === 'checkout'}
              busyLabel="Placing order..."
            />
          </View>
        ) : undefined
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <Card style={{ padding: 15 }}>
          <Row gap={14}>
            <Avatar initials={sh.initials} size={64} radius={17} bg={sh.tint} />
            <View style={{ flex: 1 }}>
              <Row gap={8}>
                <Text style={[t.overlayTitle, { color: c.txt }]}>{sh.name}</Text>
                <MicroBadge label="Partner store" bg={alpha(c.volt, 0.14)} fg={c.accent} />
              </Row>
              <Text style={[t.bodySm, { color: c.txt2, marginTop: 3 }]}>
                {[sh.category, distanceLabel ? `${distanceLabel} away` : null].filter(Boolean).join(' - ')}
              </Text>
              <Row gap={5} style={{ marginTop: 4 }}>
                <Stars value={1} />
                <Text style={[t.labelSm, { color: c.txt }]}>{sh.rating.toFixed(1)}</Text>
                <Text style={[t.caption, { color: c.txt3 }]}>({sh.reviews})</Text>
              </Row>
            </View>
          </Row>
        </Card>

        <Card style={{ marginTop: 12, padding: 14 }} background={alpha(c.volt, 0.08)} borderColor={alpha(c.volt, 0.25)}>
          <Row gap={10}>
            <Icon name="tag" size={18} color={c.accent} />
            <Text style={[t.labelSm, { color: c.accent, flex: 1 }]}>{sh.deal} applied at in-app checkout</Text>
          </Row>
        </Card>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Popular items</SectionHeading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
          {sh.products.map((prod) => {
            const key = `${sh.id}:${prod.id ?? prod.name}`;
            const added = key in s.cart;
            return (
              <View key={prod.name} style={{ width: '48.5%' }}>
                <Card style={{ padding: 10 }}>
                  <StripedPlaceholder caption={prod.ph} height={92} />
                  <Text style={[t.labelSm, { color: c.txt, marginTop: 10 }]} numberOfLines={1}>{prod.name}</Text>
                  <Row style={{ marginTop: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[t.priceSm, { color: c.accent }]}>${prod.price}</Text>
                    <Pressable onPress={() => s.toggleCartItem(key, prod.price)} style={{ borderRadius: 999, backgroundColor: added ? c.volt : c.surface2, paddingHorizontal: 14, paddingVertical: 7 }}>
                      <Text style={[t.caption, { fontFamily: t.labelSm.fontFamily, color: added ? c.ink : c.txt2 }]}>{added ? 'Added ✓' : 'Add'}</Text>
                    </Pressable>
                  </Row>
                </Card>
              </View>
            );
          })}
        </View>
      </View>
    </OverlayScaffold>
  );
}

const MEANS = ['Phone call', 'WhatsApp', 'Email', 'In-app chat'];

export function ShopRegisterOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const canSubmit = s.shopRegName.trim().length > 0 && (s.shopRegPhone.trim().length > 0 || s.shopRegEmail.trim().length > 0);

  const submit = () => {
    if (!canSubmit) return;
    void s.submitShopRegistration();
  };

  if (s.shopRegDone) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Be a Shop" onBack={s.closeOverlay} />}>
        <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 70 }}>
          <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={34} color={c.ink} />
          </View>
          <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>Request sent</Text>
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>Our admins will contact you to set up the partnership deal and onboard your storefront.</Text>
        </View>
      </OverlayScaffold>
    );
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title="Be a Shop" onBack={s.closeOverlay} />}
      bottomBar={<View style={{ padding: 16, backgroundColor: c.bg }}><VoltButton label="Send request to admins" enabled={canSubmit} onPress={submit} /></View>}
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Shop name</SectionHeading>
        <Field value={s.shopRegName} onChange={(v) => s.set('shopRegName', v)} placeholder="Your store name" />

        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Category</SectionHeading>
        <Pressable onPress={() => s.set('shopRegCatMenu', !s.shopRegCatMenu)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 }}>
          <Text style={[t.body, { color: s.shopRegCat ? c.txt : c.txt3, flex: 1 }]}>{s.shopRegCat ?? 'Select a category'}</Text>
          <Icon name={s.shopRegCatMenu ? 'chevron-up' : 'chevron-down'} size={18} color={c.txt3} />
        </Pressable>
        {s.shopRegCatMenu && (
          <Card style={{ marginTop: 8, padding: 6 }}>
            {D.shopCategories.map((cat) => (
              <Pressable key={cat} onPress={() => { s.set('shopRegCat', cat); s.set('shopRegCatMenu', false); }} style={{ paddingVertical: 11, paddingHorizontal: 10 }}>
                <Text style={[t.label, { color: c.txt }]}>{cat}</Text>
              </Pressable>
            ))}
          </Card>
        )}
        {s.shopRegCat === 'Other' && (
          <View style={{ marginTop: 10 }}>
            <Field value={s.shopRegCatOther} onChange={(v) => s.set('shopRegCatOther', v)} placeholder="What your shop sells" />
          </View>
        )}

        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Phone</SectionHeading>
        <Field value={s.shopRegPhone} onChange={(v) => s.set('shopRegPhone', v)} placeholder="+961 …" keyboardType="phone-pad" />

        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Email</SectionHeading>
        <Field value={s.shopRegEmail} onChange={(v) => s.set('shopRegEmail', v)} placeholder="shop@email.com" keyboardType="email-address" />

        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Preferred way to reach you</SectionHeading>
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {MEANS.map((m) => <Chip key={m} label={m} active={s.shopRegMeans === m} onPress={() => s.set('shopRegMeans', m)} />)}
        </Row>

        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Best time to contact</SectionHeading>
        <Field value={s.shopRegTime} onChange={(v) => s.set('shopRegTime', v)} placeholder="Weekday mornings…" />
      </View>
    </OverlayScaffold>
  );
}
