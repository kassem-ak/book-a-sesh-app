import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Card, Chip, Field, Icon, MicroBadge, Row, SectionHeading, VoltButton } from '../components/ui';
import { MarginKey, ShareKey } from '../state/models';
import * as D from '../state/sampleData';
import { fmtMoney, numStr, pct, useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

export function AdminAccountingOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const eff = s.effective();

  return (
    <OverlayScaffold
      header={<OverlayHeader title="Accounting" onBack={s.closeOverlay} trailing={<Pressable onPress={() => s.set('overlay', 'acctHistory')}><Text style={[t.labelSm, { color: c.accent }]}>History</Text></Pressable>} />}
      bottomBar={
        <View style={{ padding: 16, backgroundColor: c.bg }}>
          <Row gap={10}>
            <View style={{ flex: 1 }}>
              <VoltButton label="Propose changes" enabled={s.acctDirty() && s.sharesOk() && s.acctEditable()} onPress={s.submitProposal} />
            </View>
            <Pressable onPress={s.acctDirty() && s.acctEditable() ? s.discardDraft : undefined} style={{ flex: 1, height: 52, borderRadius: 15, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[t.overlayTitle, { fontSize: 16, color: s.acctDirty() && s.acctEditable() ? c.txt2 : c.txt3 }]}>Discard</Text>
            </Pressable>
          </Row>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <SectionHeading>This month</SectionHeading>
          <MicroBadge label="Admins only" bg={alpha(c.volt, 0.12)} fg={c.accent} />
        </Row>
        <Card style={{ marginTop: 11, padding: 15 }}>
          <MoneyRow label="Revenue" value={fmtMoney(s.revenue)} />
          <View style={{ height: 10 }} />
          {s.acctExpItems.map((e) => (
            <Pressable key={e.id} onPress={() => s.openExpenseEdit(e)} style={{ paddingVertical: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.bodySm, { color: c.soft }]}>{e.label}</Text>
                  <Text style={[t.caption, { color: c.txt3 }]}>{e.recur}</Text>
                </View>
                <Text style={[t.labelSm, { color: c.danger }]}>-{fmtMoney(e.amt)}</Text>
              </Row>
            </Pressable>
          ))}
          <Pressable onPress={s.openExpenseNew} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <Icon name="plus" size={18} color={c.accent} />
            <Text style={[t.labelSm, { color: c.accent }]}>Add expense</Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 8 }} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={[t.name, { color: c.txt2 }]}>Net profit</Text>
            <Text style={[t.price, { color: c.accent }]}>{fmtMoney(s.net())}</Text>
          </Row>
        </Card>

        <SectionHeading style={{ marginTop: 22, marginBottom: 11 }}>Margins per transaction</SectionHeading>
        <View style={{ gap: 10 }}>
          {D.marginDefs.map(([key, label]) => {
            const changed = eff.margins[key as MarginKey] !== s.acctMargins[key as MarginKey];
            return (
              <PercentRow key={key} label={label} raw={s.acctRawText('margins', key)} valueLabel={changed ? `was ${pct(s.acctMargins[key as MarginKey])}` : pct(eff.margins[key as MarginKey])} changed={changed} enabled={s.acctEditable()} onMinus={() => s.acctAdjust('margins', key, -0.5)} onPlus={() => s.acctAdjust('margins', key, 0.5)} onRaw={(v) => s.acctEditRaw('margins', key, v)} />
            );
          })}
        </View>

        <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
          <SectionHeading>Admin profit shares</SectionHeading>
          <Text style={[t.labelSm, { color: s.sharesOk() ? c.accent : c.danger }]}>Total {pct(s.sharesTotal())}</Text>
        </Row>
        <View style={{ marginTop: 11, gap: 10 }}>
          {D.shareDefs.map(([key, label]) => {
            const changed = eff.shares[key as ShareKey] !== s.acctShares[key as ShareKey];
            return (
              <PercentRow key={key} label={`${label} - ${s.payoutLabel(key)}`} raw={s.acctRawText('shares', key)} valueLabel={changed ? `was ${pct(s.acctShares[key as ShareKey])}` : pct(eff.shares[key as ShareKey])} changed={changed} enabled={s.acctEditable()} onMinus={() => s.acctAdjust('shares', key, -1)} onPlus={() => s.acctAdjust('shares', key, 1)} onRaw={(v) => s.acctEditRaw('shares', key, v)} />
            );
          })}
        </View>

        {s.acctProposal && (
          <Card style={{ marginTop: 12, padding: 15 }} background={alpha(c.amber, 0.1)} borderColor={alpha(c.amber, 0.25)}>
            <Row gap={8}>
              <MicroBadge label="Pending" bg={alpha(c.amber, 0.18)} fg={c.amberText} />
              <Text style={[t.labelSm, { color: c.amberText }]}>{s.acctProposal.approvals.length} of 3 approvals</Text>
            </Row>
            <View style={{ marginTop: 10, gap: 5 }}>
              {s.acctProposal.lines.map((l, i) => (
                <Text key={i} style={[t.bodySm, { color: c.soft }]}>{l}</Text>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 4 }}>
              {s.acctProposal.approvals.map((n) => (
                <MicroBadge key={n} label={n} bg={c.surface2} fg={c.txt2} />
              ))}
            </ScrollView>
            <Row style={{ marginTop: 13, flexWrap: 'wrap' }} gap={9}>
              {D.allAdmins.filter((a) => !s.acctProposal!.approvals.includes(a)).map((admin) => (
                <Pressable key={admin} onPress={() => s.approveAs(admin)} style={{ borderRadius: 999, backgroundColor: c.volt, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: c.ink }]}>Approve as {admin.split(' ')[0]}</Text>
                </Pressable>
              ))}
              <Pressable onPress={s.cancelProposal} style={{ borderRadius: 999, backgroundColor: c.surface2, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={[t.caption, { fontFamily: t.microBadge.fontFamily, color: c.txt2 }]}>Withdraw</Text>
              </Pressable>
            </Row>
          </Card>
        )}

        {s.acctAppliedNote && (
          <Card style={{ marginTop: 12, padding: 14 }} background={alpha(c.volt, 0.1)} borderColor={alpha(c.volt, 0.22)}>
            <Text style={[t.bodySm, { color: c.accent }]}>{s.acctAppliedNote}</Text>
          </Card>
        )}
      </View>
    </OverlayScaffold>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  const { c, t } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text style={[t.bodySm, { color: c.txt2 }]}>{label}</Text>
      <Text style={[t.labelSm, { color: c.accent }]}>{value}</Text>
    </Row>
  );
}

function PercentRow({ label, raw, valueLabel, changed, enabled, onMinus, onPlus, onRaw }: { label: string; raw: string; valueLabel: string; changed: boolean; enabled: boolean; onMinus: () => void; onPlus: () => void; onRaw: (v: string) => void }) {
  const { c, t } = useTheme();
  return (
    <Card background={enabled ? c.surface : c.surface2}>
      <Row style={{ padding: 12 }} gap={7}>
        <View style={{ flex: 1 }}>
          <Text style={[t.labelSm, { color: c.txt }]} numberOfLines={2}>{label}</Text>
          <Text style={[t.caption, { color: changed ? c.accent : c.txt3, marginTop: 3 }]}>{valueLabel}</Text>
        </View>
        <Step icon="minus" enabled={enabled} onPress={onMinus} />
        <Field value={raw} onChange={onRaw} placeholder="0" keyboardType="decimal-pad" width={64} align="center" textColor={changed ? c.accent : undefined} />
        <Step icon="plus" enabled={enabled} onPress={onPlus} />
      </Row>
    </Card>
  );
}

function Step({ icon, enabled, onPress }: { icon: any; enabled: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={enabled ? onPress : undefined} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: enabled ? c.surface2 : alpha(c.mono, 0.12), alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} color={enabled ? c.accent : c.txt3} />
    </Pressable>
  );
}

export function AccountingExpenseOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const editing = s.acctExpId !== null;
  return (
    <OverlayScaffold
      header={<OverlayHeader title={editing ? 'Edit expense' : 'Add expense'} onBack={() => s.set('overlay', 'adminAccounting')} />}
      bottomBar={
        <View style={{ padding: 16, backgroundColor: c.bg, gap: 12 }}>
          <VoltButton label="Save expense" enabled={s.canSaveExpense()} onPress={s.saveExpense} />
          {editing && (
            <Pressable onPress={s.deleteExpense} style={{ height: 52, borderRadius: 15, backgroundColor: alpha(c.danger, 0.14), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[t.overlayTitle, { fontSize: 16, color: c.danger }]}>Delete expense</Text>
            </Pressable>
          )}
        </View>
      }
    >
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeading style={{ marginBottom: 11 }}>Name</SectionHeading>
        <Field value={s.acctExpName} onChange={(v) => s.set('acctExpName', v)} placeholder="Servers and infrastructure" />
        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Amount</SectionHeading>
        <Field value={s.acctExpAmt} onChange={(v) => s.set('acctExpAmt', v)} placeholder="0.00" keyboardType="decimal-pad" />
        <SectionHeading style={{ marginTop: 20, marginBottom: 11 }}>Recurrence</SectionHeading>
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {D.recurOptions.map((r) => (
            <Chip key={r} label={r} active={s.acctExpRecur === r} onPress={() => s.set('acctExpRecur', r)} />
          ))}
        </Row>
        <Text style={[t.bodySm, { color: c.txt3, marginTop: 9 }]}>{D.recurHints[s.acctExpRecur]}</Text>
      </View>
    </OverlayScaffold>
  );
}

export function AccountingHistoryOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  return (
    <OverlayScaffold header={<OverlayHeader title="History" onBack={() => s.set('overlay', 'adminAccounting')} />}>
      <View style={{ paddingHorizontal: 18, gap: 11 }}>
        {s.acctHistory.map((h, i) => (
          <Card key={i}>
            <Row style={{ padding: 14, alignItems: 'flex-start' }} gap={12}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="clock" size={19} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={[t.name, { color: c.txt, flex: 1 }]}>{h.title}</Text>
                  <Text style={[t.caption, { color: c.txt3 }]}>{h.whenLabel}</Text>
                </Row>
                <Text style={[t.bodySm, { color: c.txt2, marginTop: 4 }]}>{h.detail}</Text>
                <Text style={[t.caption, { color: c.txt3, marginTop: 4 }]}>{h.meta}</Text>
              </View>
            </Row>
          </Card>
        ))}
      </View>
    </OverlayScaffold>
  );
}
