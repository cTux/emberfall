import { game, type createGame } from '../game.ts';
type Game = ReturnType<typeof createGame>;
import type { SceneState, Player } from '@emberfall/common';
import { AILMENT_DEFINITIONS } from '../definitions/effects/ailments.ts';
import { hitEnemy } from './damage.ts';

export function tickDebuffs(
  scene: SceneState,
  players: Player[],
  now: number,
  context: Game = game,
) {
  for (const enemy of scene.enemies) {
    for (const debuff of enemy.debuffs ?? []) {
      if (AILMENT_DEFINITIONS[debuff.kind].damagePerStack === 0) {
        continue;
      }

      while (debuff.nextTick <= Math.min(now, debuff.expiresAt) && enemy.hitpoints > 0) {
        const owner = players.find((p) => {
          return p.id === debuff.ownerId;
        });
        hitEnemy(
          scene,
          enemy,
          debuff.stacks * AILMENT_DEFINITIONS[debuff.kind].damagePerStack,
          owner,
          now,
          undefined,
          debuff.kind === 'burn' ? 'fire' : debuff.kind === 'poison' ? 'poison' : 'physical',
          false,
          debuff.kind[0].toUpperCase() + debuff.kind.slice(1),
          owner ? context.rules.characterStats(owner) : undefined,
          context,
        );
        debuff.nextTick += debuff.tickIntervalMs ?? AILMENT_DEFINITIONS[debuff.kind].tickMs;
      }
    }

    enemy.debuffs = enemy.debuffs?.filter((d) => {
      return d.expiresAt > now;
    });
  }
}
