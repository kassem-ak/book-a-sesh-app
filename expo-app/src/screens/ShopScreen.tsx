import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Avatar, Card, Icon, MicroBadge, Row, SectionHeading, Segmented, Stars } from '../components/ui';
import { distanceKmBetween, formatDistanceKm, GeoPoint, getDevicePoint, mapPointToPercent, MapPoint, parseGeoPoint } from '../lib/geo';
import { fetchShops } from '../lib/queries';
import { supabase } from '../lib/supabase';
import { Shop } from '../state/models';
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
  location?: unknown;
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

type GeoShop = Shop & {
  coordinates?: GeoPoint | null;
  distanceKm?: number | null;
};

type ShopEntry = {
  shop: Shop;
  index: number;
  coordinates: GeoPoint | null;
  distanceKm: number | null;
  distanceLabel: string | null;
};

type ShopPin = ShopEntry & {
  mapPoint: MapPoint;
};

const SHOP_SELECT = 'id, slug, name, initials, tint, category, deal_text, rating_avg, reviews_count, location, products(id, name, price_cents, image_url, is_featured, position, active)';

async function fetchShopRows(): Promise<RemoteShop[]> {
  const { data, error } = await supabase
    .from('shops')
    .select(SHOP_SELECT)
    .eq('status', 'approved')
    .eq('is_partner', true)
    .order('rating_avg', { ascending: false });
  if (!error) return (data ?? []) as RemoteShop[];

  const fallback = await fetchShops();
  return Array.isArray(fallback) ? (fallback as RemoteShop[]) : [];
}

function shopCoordinates(sh: Shop) {
  return (sh as GeoShop).coordinates ?? null;
}

function shopDistanceKm(sh: Shop, devicePoint: GeoPoint | null | undefined) {
  return distanceKmBetween(devicePoint ?? null, shopCoordinates(sh));
}

function fromRemoteShop(row: RemoteShop, devicePoint?: GeoPoint | null): GeoShop {
  const products = [...(row.products ?? [])]
    .filter((product) => product.active !== false)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: Math.round((product.price_cents ?? 0) / 100),
      ph: product.image_url ? product.name : `${product.name} shot`,
    }));

  const coordinates = parseGeoPoint(row.location ?? row);
  const distanceKm = distanceKmBetween(devicePoint ?? null, coordinates);

  return {
    id: row.slug ?? row.id,
    name: row.name,
    initials: row.initials ?? fallbackInitials(row.name),
    tint: row.tint ?? '#2A3A2E',
    category: row.category ?? 'Sports gear',
    dist: distanceKm ?? Number.POSITIVE_INFINITY,
    rating: toNumber(row.rating_avg),
    reviews: row.reviews_count ?? 0,
    deal: row.deal_text ?? 'In-app checkout',
    pinTop: Number.NaN,
    pinLeft: Number.NaN,
    products,
    coordinates,
    distanceKm,
  };
}
export function ShopScreen() {
  const { c, t } = useTheme();
  const s = useStore();
  const setRemoteShops = useStore((state) => state.setRemoteShops);
  const [remoteRows, setRemoteRows] = useState<RemoteShop[] | null>(null);
  const [devicePoint, setDevicePoint] = useState<GeoPoint | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetchShopRows()
      .then((rows) => {
        if (active) setRemoteRows(rows);
      })
      .catch(() => {
        if (active) {
          setRemoteRows([]);
          setRemoteShops([]);
        }
      });
    return () => {
      active = false;
    };
  }, [setRemoteShops]);

  const hasShopCoordinates = (remoteRows ?? []).some((row) => parseGeoPoint(row.location ?? row));

  useEffect(() => {
    if (!hasShopCoordinates) {
      setDevicePoint(null);
      return;
    }

    let active = true;
    getDevicePoint().then((point) => {
      if (active) setDevicePoint(point);
    });
    return () => {
      active = false;
    };
  }, [hasShopCoordinates]);

  useEffect(() => {
    if (!remoteRows) return;
    setRemoteShops(remoteRows.map((row) => fromRemoteShop(row, devicePoint ?? null)));
  }, [devicePoint, remoteRows, setRemoteShops]);

  const shopEntries: ShopEntry[] = s.shops().map((shop, index) => {
    const coordinates = shopCoordinates(shop);
    const distanceKm = shopDistanceKm(shop, devicePoint);
    return { shop, index, coordinates, distanceKm, distanceLabel: formatDistanceKm(distanceKm) };
  });
  const canSortByDistance = shopEntries.some((entry) => entry.distanceKm !== null);
  const shops = canSortByDistance
    ? [...shopEntries].sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
        if (a.distanceKm !== null) return -1;
        if (b.distanceKm !== null) return 1;
        return a.index - b.index;
      })
    : shopEntries;
  const shopListHeading = canSortByDistance ? 'Closest first' : 'Partner stores';

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
        <ShopMap shops={shops} devicePoint={devicePoint ?? null} />
      ) : (
        <>
          <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>{shopListHeading}</SectionHeading>
          <View style={{ gap: 11 }}>
            {shops.map((entry) => (
              <ShopCard key={entry.shop.id} entry={entry} onPress={() => s.openShop(entry.shop.id)} />
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
          <Pressable onPress={() => s.set('overlay', 'shopRegister')} accessibilityRole="button" accessibilityLabel="Register a partner shop" style={{ borderRadius: 999, backgroundColor: c.volt, paddingHorizontal: 16, paddingVertical: 11 }}>
            <Text style={[t.labelSm, { color: c.ink }]}>Be a Shop</Text>
          </Pressable>
        </Row>
      </Card>
    </ScrollView>
  );
}

function ShopCard({ entry, onPress }: { entry: ShopEntry; onPress: () => void }) {
  const { c, t } = useTheme();
  const sh = entry.shop;
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
        {entry.distanceLabel ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[t.priceSm, { color: c.accent }]}>{entry.distanceLabel}</Text>
            <Text style={[t.caption, { color: c.txt3 }]}>away</Text>
          </View>
        ) : null}
      </Row>
    </Card>
  );
}

function ShopMap({ shops, devicePoint }: { shops: ShopEntry[]; devicePoint: GeoPoint | null }) {
  const { c, t } = useTheme();
  const s = useStore();
  const coordinatePoints = shops.map((entry) => entry.coordinates).filter((point): point is GeoPoint => Boolean(point));
  const pins = shops
    .map((entry) => {
      if (!entry.coordinates) return null;
      const mapPoint = mapPointToPercent(entry.coordinates, coordinatePoints, devicePoint);
      return mapPoint ? { ...entry, mapPoint } : null;
    })
    .filter((entry): entry is ShopPin => Boolean(entry));
  const nearest = shops
    .filter((entry) => entry.distanceKm !== null)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))[0];
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
        {pins.map((entry) => {
          const sh = entry.shop;
          return (
            <Pressable
              key={sh.id}
              onPress={() => s.openShop(sh.id)}
              accessibilityRole="button"
              accessibilityLabel={`${sh.name} on map`}
              style={{ position: 'absolute', top: `${entry.mapPoint.top}%`, left: `${entry.mapPoint.left}%`, alignItems: 'center' }}
            >
              <Avatar initials={sh.initials} size={44} radius={13} bg={sh.tint} />
              {entry.distanceLabel ? (
                <View style={{ marginTop: 4, backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={[t.caption, { color: c.accent }]}>{entry.distanceLabel}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {nearest && (() => {
        const sh = nearest.shop;
        return (
          <View style={{ marginTop: -70, marginHorizontal: 10 }}>
            <Card onPress={() => s.openShop(sh.id)} style={{ padding: 12 }}>
              <Row gap={12}>
                <Avatar initials={sh.initials} size={48} radius={13} bg={sh.tint} />
                <View style={{ flex: 1 }}>
                  <Text style={[t.name, { color: c.txt }]}>{sh.name}</Text>
                  <Text style={[t.bodySm, { color: c.txt2, marginTop: 1 }]}>{sh.category} - {sh.deal}</Text>
                </View>
                {nearest.distanceLabel ? <Text style={[t.priceSm, { color: c.accent }]}>{nearest.distanceLabel}</Text> : null}
              </Row>
            </Card>
          </View>
        );
      })()}
    </View>
  );
}
