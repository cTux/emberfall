import { TalentIcon, talentIconIndex } from './talent-icons';
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
          size: node.kind === 'ability' ? 34 : node.kind === 'center' ? 22 : 46,
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
