import { Box } from '@mui/material';
import type { Player, ClientMessage } from '@emberfall/common';
import {
  TALENT_TREE,
  TALENT_LABELS,
  availableTalentPoints,
  canLearnTalent,
  isTalentLearned,
  talentAbility,
  talentCooldownMs,
} from '@emberfall/core';
import { TalentTree } from '@emberfall/ui';
export function TalentIcon({ index }: { index: number }) {
  return (
    <Box
      component='span'
      aria-hidden='true'
      sx={{
        display: 'block',
        width: '100%',
        height: '100%',
        backgroundImage: 'url(/assets/talent-icons.png)',
        backgroundSize: '500% 400%',
        backgroundPosition: `${(index % 5) * 25}% ${(Math.floor(index / 5) * 100) / 3}%`,
      }}
    />
  );
}
export function talentIconIndex(classId: string, slot: number) {
  return 4 + Math.max(0, ['warrior', 'ranger', 'mage', 'druid'].indexOf(classId)) * 4 + slot;
}
export function Talents({
  player,
  send,
}: {
  player: Player;
  send: (message: ClientMessage) => void;
}) {
  return (
    <TalentTree
      points={availableTalentPoints(player)}
      onLearn={(nodeId) => send({ type: 'learnTalent', nodeId })}
      nodes={TALENT_TREE.map((node) => {
        const ability = node.slot === undefined ? undefined : talentAbility(player, node.slot);
        const index =
          node.slot === undefined
            ? ['power', 'speed', 'criticalChance', 'criticalDamage'].indexOf(node.kind)
            : talentIconIndex(player.classId ?? 'warrior', node.slot);
        return {
          ...node,
          name: ability?.name ?? TALENT_LABELS[node.kind],
          description: ability
            ? `${ability.count || 1} ${ability.kind === 'slash' ? 'strike' : 'projectiles'}, ${ability.powerScale}× power. ${Math.round(talentCooldownMs(player, node.slot!) / 100) / 10}s cooldown. Slot ${node.slot! + 1}.`
            : node.kind === 'center'
              ? 'Free starting node'
              : TALENT_LABELS[node.kind],
          icon: index >= 0 ? <TalentIcon index={index} /> : undefined,
          learned: isTalentLearned(player, node.id),
          available: canLearnTalent(player, node.id),
        };
      })}
    />
  );
}
