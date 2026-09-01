import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Chip, Field, Icon, Row, SectionHeading, VoltButton } from '../components/ui';
import * as D from '../state/sampleData';
import { isExplicit, useStore } from '../state/store';
import { useTheme } from '../theme';

// Delta section D → "Registration (community · venue · shop) — ONE shared form".
// The prototype keeps a single `reg` overlay and switches only its copy on
// `regKind`; the field list, ordering and the admin hand-off are identical for
// all three kinds. Every submission is an admin approval item.
export type RegKind = 'community' | 'venue' | 'shop';

const CHANNELS = ['Phone call', 'WhatsApp', 'Email', 'In-app chat'];

// Prototype `regCats`. Shops keep the app's own catalogue list so the value we
// send to `submitShopRegistration` still matches what the backend expects.
const REG_CATEGORIES = ['Running', 'Strength', 'Boxing', 'Paddle', 'Basketball', 'Chess', 'Other'];

type Copy = {
  title: string;
  nameLabel: string;
  namePh: string;
  officialQ: string;
  footnote: string;
  sentLine: string;
};

const COPY: Record<RegKind, Copy> = {
  community: {
    title: 'Community registration',
    nameLabel: 'Community name',
    namePh: 'e.g. Summit Trail Co.',
    officialQ: 'Is it an official Entity? (federation, institute, etc..)',
    footnote: 'New communities start unofficial. The OFFICIAL badge is granted only by BOOK’D admins after review.',
    sentLine: 'The BOOK’D team reviews every request. When it goes live, you’ll be its first member automatically.',
  },
  venue: {
    title: 'Venue registration',
    nameLabel: 'Venue name',
    namePh: 'e.g. Let’s Go Paddle',
    officialQ: 'Is it an official Entity? (federation, institute, etc..)',
    footnote: 'An admin reviews every request and reaches out within 2 business days to agree on courts, hours and the commission.',
    sentLine: 'Your venue was forwarded to the BOOK’D admins. They’ll contact you to set up courts and pricing.',
  },
  shop: {
    title: 'Shop registration',
    nameLabel: 'Shop name',
    namePh: 'e.g. Summit Trail Co.',
    officialQ: 'Is it an official Entity? (federation, institute, etc..)',
    footnote: 'An admin reviews every request and reaches out within 2 business days to discuss commission, delivery and store setup.',
    sentLine: 'Your registration was forwarded to the BOOK’D admins. They’ll contact you to make the deal and open your store.',
  },
};

const nameIcon = { community: 'users', venue: 'map-pin', shop: 'shopping-bag' } as const;

export function RegistrationOverlay() {
  const { c, t } = useTheme();
  const s = useStore();

  // `regKind` / `regChannel` / `regTime` are prototype state that the shared
  // store does not carry yet — read them defensively so this works either way.
  const store = s as unknown as Record<string, unknown>;
  const rawKind = store.regKind;
  const kind: RegKind = rawKind === 'venue' || rawKind === 'shop' ? rawKind : 'community';
  const copy = COPY[kind];
  const categories = kind === 'shop' ? D.shopCategories : REG_CATEGORIES;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [categoryOther, setCategoryOther] = useState('');
  const [catMenu, setCatMenu] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState<string | null>(typeof store.regChannel === 'string' ? (store.regChannel as string) : null);
  const [bestTime, setBestTime] = useState(typeof store.regTime === 'string' ? (store.regTime as string) : '');
  const [official, setOfficial] = useState<boolean | null>(null);
  const [docs, setDocs] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const blocked = isExplicit(name);
  const trimmed = name.trim();
  const canSend = trimmed.length > 1 && !blocked && (phone.trim().length > 0 || email.trim().length > 0);
  const busy = s.writeBusy === 'shop-registration';

  const submit = () => {
    if (!canSend || busy) return;
    // Shops already have a persisted approvals path; reuse it so the request
    // lands in the admin queue instead of only living in this component.
    if (kind === 'shop' && typeof s.submitShopRegistration === 'function') {
      s.set('shopRegName', trimmed);
      s.set('shopRegCat', category);
      s.set('shopRegCatOther', categoryOther.trim());
      s.set('shopRegPhone', phone.trim());
      s.set('shopRegEmail', email.trim());
      s.set('shopRegMeans', channel);
      s.set('shopRegTime', bestTime.trim());
      void s.submitShopRegistration().then(() => {
        if (useStore.getState().shopRegDone) setSent(true);
      });
      return;
    }
    // Community and venue have no server table yet, so the request is queued in
    // the store and rendered in the admin approvals list rather than dropped.
    const meta = [
      phone.trim() && `Phone ${phone.trim()}`,
      email.trim() && email.trim(),
      channel && `prefers ${channel}`,
      bestTime.trim() && `best ${bestTime.trim()}`,
    ]
      .filter(Boolean)
      .join(' · ');
    s.recordRegistration(kind, trimmed, meta);
    setSent(true);
  };

  if (sent) {
    return (
      <OverlayScaffold header={<OverlayHeader title={copy.title} onBack={s.closeOverlay} />}>
        <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 60 }}>
          <View
            style={{
              width: 74,
              height: 74,
              borderRadius: 999,
              borderColor: c.volt,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={32} color={c.accent} />
          </View>
          <Text style={[t.overlayTitle, { fontSize: 23, color: c.txt, marginTop: 20 }]}>Request sent</Text>
          <Text style={[t.bodyLg, { color: c.soft, marginTop: 9, textAlign: 'center', lineHeight: 22, maxWidth: 290 }]}>
            {copy.sentLine}
          </Text>
          <Text style={[t.caption, { color: c.txt3, marginTop: 14, textAlign: 'center' }]}>
            Tracked as an admin approval item.
          </Text>
          <View style={{ width: '100%', maxWidth: 260, marginTop: 26 }}>
            <TapTarget label="Done, close registration" onPress={s.closeOverlay}>
              <VoltButton label="Done" onPress={s.closeOverlay} height={50} />
            </TapTarget>
          </View>
        </View>
      </OverlayScaffold>
    );
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title={copy.title} onBack={s.closeOverlay} />}
      bottomBar={
        <View style={{ padding: 16, backgroundColor: c.bg }}>
          <TapTarget label="Send request to admins" onPress={submit} disabled={!canSend || busy}>
            <VoltButton label={busy ? 'Sending…' : 'Send request to admins'} enabled={canSend && !busy} onPress={submit} />
          </TapTarget>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 9 }}>{copy.nameLabel}</SectionHeading>
        <Field value={name} onChange={setName} placeholder={copy.namePh} icon={nameIcon[kind]} />
        {blocked && (
          <Text style={[t.caption, { color: c.danger, marginTop: 8 }]}>
            Contains blocked content — this will be flagged.
          </Text>
        )}

        <SectionHeading style={{ marginTop: 20, marginBottom: 9 }}>Category</SectionHeading>
        <Pressable
          onPress={() => setCatMenu(!catMenu)}
          accessibilityRole="button"
          accessibilityLabel={category ? `Category, ${category}. Change category` : 'Select a category'}
          accessibilityState={{ expanded: catMenu }}
          style={{
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surface,
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: 15,
            paddingVertical: 13,
          }}
        >
          <Text style={[t.body, { color: category ? c.txt : c.txt3, flex: 1 }]}>{category ?? 'Select a category'}</Text>
          <Icon name={catMenu ? 'chevron-up' : 'chevron-down'} size={18} color={c.txt3} />
        </Pressable>
        {catMenu && (
          <Card style={{ marginTop: 8, padding: 6 }}>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => {
                  setCategory(cat);
                  setCatMenu(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Category ${cat}`}
                accessibilityState={{ selected: category === cat }}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                  borderRadius: 11,
                  backgroundColor: category === cat ? c.surface2 : 'transparent',
                }}
              >
                <Text style={[t.label, { color: category === cat ? c.txt : c.txt2 }]}>{cat}</Text>
              </Pressable>
            ))}
          </Card>
        )}
        {category === 'Other' && (
          <View style={{ marginTop: 10 }}>
            <Field value={categoryOther} onChange={setCategoryOther} placeholder="Tell us the category" />
          </View>
        )}

        <SectionHeading style={{ marginTop: 20, marginBottom: 9 }}>Phone</SectionHeading>
        <Field value={phone} onChange={setPhone} placeholder="e.g. +961 3 123 456" keyboardType="phone-pad" icon="phone" />

        <SectionHeading style={{ marginTop: 20, marginBottom: 9 }}>Email</SectionHeading>
        <Field value={email} onChange={setEmail} placeholder="e.g. hello@yourcrew.com" keyboardType="email-address" icon="at-sign" />

        <SectionHeading style={{ marginTop: 20, marginBottom: 9 }}>Preferred way to reach you</SectionHeading>
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {CHANNELS.map((ch) => (
            <TapTarget
              key={ch}
              label={`Preferred contact, ${ch}`}
              selected={channel === ch}
              onPress={() => setChannel(ch)}
            >
              <Chip label={ch} active={channel === ch} onPress={() => setChannel(ch)} />
            </TapTarget>
          ))}
        </Row>

        <SectionHeading style={{ marginTop: 20, marginBottom: 9 }}>Best time to contact</SectionHeading>
        <Field value={bestTime} onChange={setBestTime} placeholder="e.g. weekdays after 5 PM" icon="clock" />

        <Text style={[t.bodySm, { color: c.soft, marginTop: 22, lineHeight: 20 }]}>{copy.officialQ}</Text>
        <Row style={{ marginTop: 10 }} gap={10}>
          <TapTarget label="Yes, it is an official entity" selected={official === true} onPress={() => setOfficial(true)}>
            <Chip label="YES" active={official === true} onPress={() => setOfficial(true)} />
          </TapTarget>
          <TapTarget label="No, it is not an official entity" selected={official === false} onPress={() => setOfficial(false)}>
            <Chip label="NO" active={official === false} onPress={() => setOfficial(false)} />
          </TapTarget>
        </Row>

        {official === true && (
          <Pressable
            onPress={() => setDocs(docs ? null : 'official-documents.pdf')}
            accessibilityRole="button"
            accessibilityLabel={docs ? `Attached ${docs}. Tap to remove` : 'Upload official documents'}
            style={{
              marginTop: 16,
              height: 150,
              borderRadius: 18,
              borderColor: docs ? c.volt : c.line,
              borderWidth: 1,
              borderStyle: 'dashed',
              backgroundColor: c.surface,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Icon name={docs ? 'file-text' : 'image'} size={28} color={docs ? c.accent : c.txt3} />
            <Text style={[t.labelSm, { color: docs ? c.accent : c.txt3 }]}>
              {docs ?? 'Upload official documents'}
            </Text>
          </Pressable>
        )}

        <Text style={[t.caption, { color: c.txt3, marginTop: 22, lineHeight: 18 }]}>{copy.footnote}</Text>
      </View>
    </OverlayScaffold>
  );
}

// `Chip` and `VoltButton` are owned by another agent and expose no a11y props,
// so we wrap them: the wrapper carries the role/label and guarantees the 44px
// target, and its descendants are hidden from the a11y tree to avoid a double
// announcement. Both layers call the same idempotent handler.
function TapTarget({
  label,
  onPress,
  children,
  selected,
  disabled,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={{ minHeight: 44, justifyContent: 'center' }}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </View>
    </Pressable>
  );
}
