import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Field, Icon, Row, SectionHeading, VoltButton } from '../components/ui';
import * as D from '../state/sampleData';
import { isExplicit, useStore } from '../state/store';
import { useTheme } from '../theme';

// Community registration from the board: name, category, contact, official
// entity toggle with document upload, then a request to the admins.
export function CommunityRegisterOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [catMenu, setCatMenu] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [official, setOfficial] = useState<boolean | null>(null);
  const [docs, setDocs] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const blocked = isExplicit(name);
  const canSend = name.trim().length > 1 && !blocked && (phone.trim().length > 0 || email.trim().length > 0);

  if (sent) {
    return (
      <OverlayScaffold header={<OverlayHeader title="Community registration" onBack={s.closeOverlay} />}>
        <View style={{ paddingHorizontal: 18, alignItems: 'center', paddingTop: 70 }}>
          <View style={{ width: 74, height: 74, borderRadius: 999, backgroundColor: c.volt, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={34} color={c.ink} />
          </View>
          <Text style={[t.overlayTitle, { fontSize: 24, color: c.txt, marginTop: 18 }]}>Request sent</Text>
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 8, textAlign: 'center' }]}>
            Admins will review {name.trim()} and get in touch about official status.
          </Text>
        </View>
      </OverlayScaffold>
    );
  }

  return (
    <OverlayScaffold
      header={<OverlayHeader title="Community registration" onBack={s.closeOverlay} />}
      bottomBar={
        <View style={{ padding: 16, backgroundColor: c.bg }}>
          <VoltButton label="Send request to admins" enabled={canSend} onPress={() => setSent(true)} />
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Community name</SectionHeading>
        <Field value={name} onChange={setName} placeholder="e.g. Summit Trail Co." icon="users" />
        {blocked && <Text style={[t.caption, { color: c.danger, marginTop: 8 }]}>Contains blocked content — this will be flagged.</Text>}

        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Category</SectionHeading>
        <Pressable
          onPress={() => setCatMenu(!catMenu)}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 }}
        >
          <Text style={[t.body, { color: category ? c.txt : c.txt3, flex: 1 }]}>{category ?? 'Select a category'}</Text>
          <Icon name={catMenu ? 'chevron-up' : 'chevron-down'} size={18} color={c.txt3} />
        </Pressable>
        {catMenu && (
          <Card style={{ marginTop: 8, padding: 6 }}>
            {D.sportNames.filter((n) => n !== 'All').map((n) => (
              <Pressable key={n} onPress={() => { setCategory(n); setCatMenu(false); }} style={{ paddingVertical: 11, paddingHorizontal: 10 }}>
                <Text style={[t.label, { color: c.txt }]}>{n}</Text>
              </Pressable>
            ))}
          </Card>
        )}

        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Phone</SectionHeading>
        <Field value={phone} onChange={setPhone} placeholder="e.g. +961 3 123 456" keyboardType="phone-pad" icon="phone" />

        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Email</SectionHeading>
        <Field value={email} onChange={setEmail} placeholder="hello@yourshop.com" keyboardType="email-address" icon="at-sign" />

        <Text style={[t.labelSm, { color: c.txt, marginTop: 22 }]}>
          Is it an official Entity? (federation, institute, etc..)
        </Text>
        <Row style={{ marginTop: 11 }} gap={9}>
          <YesNo label="YES" active={official === true} onPress={() => setOfficial(true)} />
          <YesNo label="NO" active={official === false} onPress={() => setOfficial(false)} />
        </Row>

        {official && (
          <Pressable
            onPress={() => setDocs('federation-charter.pdf')}
            style={{
              marginTop: 16,
              borderRadius: 16,
              borderColor: c.line,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              paddingVertical: 30,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="upload-cloud" size={22} color={c.accent} />
            <Text style={[t.labelSm, { color: docs ? c.accent : c.txt2 }]}>
              {docs ?? 'Upload official Documents'}
            </Text>
          </Pressable>
        )}
      </View>
    </OverlayScaffold>
  );
}

function YesNo({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: active ? c.volt : c.surface,
        borderColor: active ? c.volt : c.line,
        borderWidth: 1,
        paddingHorizontal: 22,
        paddingVertical: 9,
      }}
    >
      <Text style={[t.labelSm, { color: active ? c.ink : c.txt2 }]}>{label}</Text>
    </Pressable>
  );
}
