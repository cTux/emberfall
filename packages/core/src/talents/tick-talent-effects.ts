import { scheduled } from './scheduled-definition.ts';
import { generations } from './generations.ts';
import type { SceneState, Player } from '@emberfall/common';
import { talentRank } from '../talent-tree.ts';

export function tickTalentEffects(scene: SceneState, players: Player[], now: number) {
  if (scene.pausedAt !== undefined || scene.phase !== 'active') {
    return;
  }

  const entries = scheduled.get(scene) ?? [];
  scheduled.set(
    scene,
    entries.filter((entry) => {
      if (
        entry.generation !== (generations.get(entry.owner) ?? 0) ||
        entry.owner.hitpoints <= 0 ||
        !players.includes(entry.owner) ||
        entry.classId !== (entry.owner.classId ?? 'warrior') ||
        !talentRank(entry.owner, entry.nodeId)
      ) {
        return false;
      }

      while (entry.at <= now && entry.at <= entry.until) {
        entry.run(entry.at, players);
        entry.at += entry.interval;
      }

      return entry.at <= entry.until;
    }),
  );
}
