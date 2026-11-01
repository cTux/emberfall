import { TalentIcon } from './talent-icons';
import { memo } from 'react';
import type { ClientMessage } from '@emberfall/common';
import { TALENT_COLUMNS, talentLearningState, talentDescription } from '@emberfall/core';
import { TalentTree } from '@emberfall/ui';
import { sameTalentProgress, type TalentProgress } from './talent-progress';

function TalentsView({
  player,
  send,
}: {
  player: TalentProgress;
  send: (message: ClientMessage) => void;
}) {
  const classId = player.classId ?? 'warrior';
  const { points, nodes } = talentLearningState(player);

  return (
    <TalentTree
      columns={TALENT_COLUMNS[classId]}
      points={points}
      onLearn={(nodeId) => {
        return send({ type: 'learnTalent', nodeId });
      }}
      nodes={nodes.map((node) => {
        return {
          ...node,
          description: talentDescription(node),
          icon: <TalentIcon classId={classId} index={node.column * 10 + node.row} />,
        };
      })}
    />
  );
}

export const Talents = memo(TalentsView, (previous, next) => {
  return previous.send === next.send && sameTalentProgress(previous.player, next.player);
});
