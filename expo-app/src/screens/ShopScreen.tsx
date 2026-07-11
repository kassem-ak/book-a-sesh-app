import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, Segmented, Stars } from '../components/ui';
import { fetchShops } from '../lib/queries';
import { Shop, shopDistLabel } from '../state/models';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';


type RemoteProduct = {
  id: string;
  name: string;
  price_cents?: number | null;
  image_url?: string | null;
  is_featured?: boolean | null;
  position?: number | null;
  active?: boolean | null;
};

type RemoteShop = {
  id: string;
  slug?: string | null;
  name: string;
  initials?: string | null;
  tint?: string | null;
  category?: string | null;
  deal_text?: string | null;
  rating_avg?: number | string | null;
  reviews_count?: number | null;
  products?: RemoteProduct[] | null;
};

function toNumber(value: number | string | null | undefined) {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function fallbackInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hashNumber(seed: string, min: number, max: number) {
  const sum = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return min + (sum % (max - min + 1));
}

function fromRemoteShop(row: RemoteShop): Shop {
  const products = [...(row.products ?? [])]
    .filter((product) => product.active !== false)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: Math.round((product.price_cents ?? 0) / 100),
      ph: product.image_url ? product.name : `${product.name} shot`,
    }));

  return {
    id: row.slug ?? row.id,
    name: row.name,
    initials: row.initials ?? fallbackInitials(row.name),
    tint: row.tint ?? '#2A3A2E',
    category: row.category ?? 'Sports gear',
    dist: Math.round((0.5 + hashNumber(row.id, 0, 35) / 10) * 10) / 10,
    rating: toNumber(row.rating_avg),
    reviews: row.reviews_count ?? 0,
    deal: row.deal_text ?? 'In-app checkout',
    pinTop: hashNumber(`${row.id}:top`, 20, 72),
    pinLeft: hashNumber(`${row.id}:left`, 24, 78),
    products,
  };
}
export function ShopScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const setRemoteShops = useStore((state) => state.setRemoteShops);

  useEffect(() => {
    let active = true;
    fetchShops()
      .then((rows) => {
        if (active && Array.isArray(rows)) setRemoteShops(rows.map((row) => fromRemoteShop(row as RemoteShop)));
      })
      .catch(() => {
        if (active) setRemoteShops([]);
      });
    return () => {
      active = false;
    };
  }, [setRemoteShops]);

  const shops = [...s.shops()].sort((a, b) => a.dist - b.dist);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 }}>
      <Text style={[t.bodySm, { color: c.txt3 }]}>Partner sports and hobby stores</Text>
      <Text style={[t.pageTitle, { color: c.txt, marginTop: 2 }]}>Shop</Text>
      <Text style={[t.body, { color: c.txt2, marginTop: 8 }]}>Buy gear in-app from nearby partner stores.</Text>

      <View style={{ marginTop: 18 }}>
        <Segmented
          options={[
            { key: 'list', label: 'List' },
            { key: 'map', label: 'Map' },
          ]}
          selected={s.shopView}
          onSelect={(k) => s.set('shopView', k)}
        />
      </View>

      {s.shopView === 'map' ? (
        <ShopMap shops={shops} />
      ) : (
        <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Closest first</SectionHeading>
          <View style={{ gap: 11 }}>
            {shops.map((sh) => (
              <ShopCard key={sh.id} sh={sh} onPress={() => s.openShop(sh.id)} />
            ))}
          </View>
        </>
      )}

      <Card style={{ marginTop: 22 }} background={alpha(c.volt, 0.08)} borderColor={alpha(c.volt, 0.25)}>
        <Row style={{ padding: 16 }} gap={13}>
          <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: alpha(c.volt, 0.14), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shopping-bag" size={20} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[t.name, { color: c.txt }]}>Own a sports or hobby shop?</Text>
            <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>Apply to sell in-app and reach nearby athletes.</Text>
          </View>
          <Pressable onPress={() => s.set('overlay', 'shopRegister')} style={{ borderRadius: 999, backgroundColor: c.volt, paddingHorizontal: 16, paddingVertical: 11 }}>
            <Text style={[t.labelSm, { color: c.ink }]}>Be a Shop</Text>
          </Pressable>
        </Row>
      </Card>
    </ScrollView>
  );
}

function ShopCard({ sh, onPress }: { sh: Shop; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Card onPress={onPress}>
      <Row style={{ padding: 14 }} gap={12}>
        <Avatar initials={sh.initials} bg={sh.tint} />
        <View style={{ flex: 1 }}>
          <Row gap={8}>
            <Text style={[t.name, { color: c.txt }]}>{sh.name}</Text>
            <MicroBadge label="Partner" bg={alpha(c.volt, 0.14)} fg={c.accent} />
          </Row>
          <Text style={[t.bodySm, { color: c.txt2, marginTop: 2 }]}>{sh.category}</Text>
          <Row gap={5} style={{ marginTop: 4 }}>
            <Stars value={1} />
            <Text style={[t.labelSm, { color: c.txt }]}>{sh.rating.toFixed(1)}</Text>
            <Text style={[t.caption, { color: c.txt3 }]}>({sh.reviews})</Text>
            <Text style={[t.caption, { color: c.txt3 }]}> {sh.deal}</Text>
          </Row>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[t.priceSm, { color: c.accent }]}>{shopDistLabel(sh.dist)}</Text>
          <Text style={[t.caption, { color: c.txt3 }]}>away</Text>
        </View>
      </Row>
    </Card>
  );
}

function ShopMap({ shops }: { shops: Shop[] }) {
  const { c, t } = useTheme();
  const s = useStore();
  const nearest = shops[0];
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ height: 520, borderRadius: 18, backgroundColor: c.mapBg, borderColor: c.line, borderWidth: 1, overflow: 'hidden' }}>
        <Svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Line key={`v${i}`} x1={`${i * 16.6}%`} y1="0" x2={`${i * 16.6}%`} y2="100%" stroke={c.grid} strokeWidth={1} />
          ))}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Line key={`h${i}`} x1="0" y1={`${i * 14}%`} x2="100%" y2={`${i * 14}%`} stroke={c.grid} strokeWidth={1} />
          ))}
        </Svg>
        {shops.map((sh) => (
          <Pressable key={sh.id} onPress={() => s.openShop(sh.id)} style={{ position: 'absolute', top: `${sh.pinTop}%`, left: `${sh.pinLeft}%`, alignItems: 'center' }}>
            <Avatar initials={sh.initials} size={44} radius={13} bg={sh.tint} />
            <View style={{ marginTop: 4, backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={[t.caption, { color: c.accent }]}>{shopDistLabel(sh.dist)}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {nearest && (
        <View style={{ marginTop: -70, marginHorizontal: 10 }}>
          <Card onPress={() => s.openShop(nearest.id)} style={{ padding: 12 }}>
            <Row gap={12}>
              <Avatar initials={nearest.initials} size={48} radius={13} bg={nearest.tint} />
              <View style={{ flex: 1 }}>
                <Text style={[t.name, { color: c.txt }]}>{nearest.name}</Text>
                <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{nearest.category} · {nearest.deal}</Text>
              </View>
              <Text style={[t.priceSm, { color: c.accent }]}>{shopDistLabel(nearest.dist)}</Text>
            </Row>
          </Card>
        </View>
      )}
    </View>
  );
}
