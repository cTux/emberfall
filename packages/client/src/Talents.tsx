import { TalentIcon } from './talent-icons';
import type { Player, ClientMessage } from '@emberfall/common';
import {
  TALENT_TREE,
  TALENT_COLUMNS,
  availableTalentPoints,
  canLearnTalent,
  isTalentLearned,
  talentRank,
  talentDescription,
} from '@emberfall/core';
import { TalentTree } from '@emberfall/ui';
export function Talents({
  player,
  send,
}: {
  player: Player;
  send: (message: ClientMessage) => void;
}) {
  const classId = player.classId ?? 'warrior';

  return (
    <TalentTree
      columns={TALENT_COLUMNS[classId]}
      points={availableTalentPoints(player)}
      onLearn={(nodeId) => {
        return send({ type: 'learnTalent', nodeId });
      }}
      nodes={TALENT_TREE.filter((node) => {
        return node.classId === classId;
      }).map((node) => {
        return {
          ...node,
          description: talentDescription(node),
          icon: <TalentIcon classId={classId} index={node.column * 10 + node.row} />,
          rank: talentRank(player, node.id),
          learned: isTalentLearned(player, node.id),
          available: canLearnTalent(player, node.id),
        };
      })}
    />
  );
}
