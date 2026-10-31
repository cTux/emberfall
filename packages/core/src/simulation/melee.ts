import { game, type createGame } from '../game.ts';
import { hitWithWeapon, defaultSpellRange } from '../class-combat.ts';
import type { Player, Bear, SceneState } from '@emberfall/common';
import { swordOverlapsEnemy } from './aim.ts';

type Game = ReturnType<typeof createGame>;
export const swordHits = new WeakMap<
  object,
  { sceneId: string; at: number; enemies: Set<number> }
>();
export function slash(
  scene: SceneState,
  actor: Player | Bear,
  owner: Player,
  now: number,
  context: Game = game,
) {
  let swing = swordHits.get(actor);
  if (!swing || swing.at !== actor.attackAt || swing.sceneId !== scene.id) {
    swing = { sceneId: scene.id, at: actor.attackAt!, enemies: new Set() };
    swordHits.set(actor, swing);
  }

  const range =
    actor === owner ? defaultSpellRange(owner, context) : context.rules.companionStats(owner).range;
  for (const enemy of scene.enemies) {
    if (
      enemy.hitpoints <= 0 ||
      swing.enemies.has(enemy.id) ||
      !swordOverlapsEnemy(actor, enemy, range, context)
    )
      continue;
    swing.enemies.add(enemy.id);
    if (actor === owner)
      hitWithWeapon(
        scene,
        enemy,
        owner,
        now,
        context.registries.classes.require(owner.classId ?? 'warrior').ailment,
        1,
        context.rules.characterStats(owner),
        false,
        context,
      );
    else
      hitWithWeapon(
        scene,
        enemy,
        owner,
        now,
        'bleed',
        1,
        context.rules.companionStats(owner),
        true,
        context,
      );
  }
}
