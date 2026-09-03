import React from 'react';
import { Text, View } from 'react-native';
import { OverlayHeader, OverlayScaffold } from '../components/Overlay';
import { Avatar, Card, MicroBadge, Row, SectionHeading } from '../components/ui';
import { useStore } from '../state/store';
import { alpha, useTheme } from '../theme';

// currentCommunityRole() returns ADMIN | MODERATOR | MEMBER, so key on that.
const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
};

// "My Communities" — the crews the signed-in user owns, moderates or follows.
export function MyCommunitiesOverlay() {
  const { c, t } = useTheme();
  const s = useStore();
  const all = s.communities();
  const mine = all.filter((cm) => s.joinedCommunities.includes(cm.id));
  const managed = mine.filter((cm) => s.canModerateCommunity(cm.id));
  const following = mine.filter((cm) => !s.canModerateCommunity(cm.id));

  return (
    <OverlayScaffold header={<OverlayHeader title="My Communities" onBack={s.closeOverlay} />}>
      <View style={{ paddingHorizontal: 18 }}>
        {mine.length === 0 && (
          <Text style={[t.bodyLg, { color: c.txt2, marginTop: 20 }]}>
            You have not joined a community yet. Join one from the Community tab and it shows up here.
          </Text>
        )}

        {managed.length > 0 && (
          <>
            <SectionHeading style={{ marginBottom: 11 }}>Managing</SectionHeading>
            <View style={{ gap: 11 }}>
              {managed.map((cm) => (
                <CommunityRow key={cm.id} cm={cm} role={s.currentCommunityRole(cm.id)} onOpen={() => s.openCommunity(cm.id)} />
              ))}
            </View>
          </>
        )}

        {following.length > 0 && (
          <>
            <SectionHeading style={{ marginTop: managed.length ? 22 : 0, marginBottom: 11 }}>Following</SectionHeading>
            <View style={{ gap: 11 }}>
              {following.map((cm) => (
                <CommunityRow key={cm.id} cm={cm} role={s.currentCommunityRole(cm.id)} onOpen={() => s.openCommunity(cm.id)} />
              ))}
            </View>
          </>
        )}
      </View>
    </OverlayScaffold>
  );
}

function CommunityRow({
  cm,
  role,
  onOpen,
}: {
  cm: { id: string; sport: string; code: string; tint: string; members: string; official: boolean };
  role: string;
  onOpen: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Card onPress={onOpen}>
      <Row style={{ padding: 14 }} gap={12}>
        <Avatar initials={cm.code} bg={cm.tint} />
        <View style={{ flex: 1 }}>
          <Row gap={8}>
            <Text style={[t.name, { color: c.txt }]}>{cm.sport}</Text>
            {cm.official && <MicroBadge label="Official" bg={alpha(c.volt, 0.14)} fg={c.accent} />}
          </Row>
          <Text style={[t.caption, { color: c.txt3, marginTop: 3 }]}>{cm.members} members</Text>
        </View>
        <MicroBadge
          label={ROLE_LABEL[role] ?? 'Member'}
          bg={role === 'MEMBER' ? c.surface2 : alpha(c.volt, 0.14)}
          fg={role === 'MEMBER' ? c.txt2 : c.accent}
        />
      </Row>
    </Card>
  );
}
