import type { LocalMovement } from '../packages/client/src/local-movement.ts';
import type { WorldState, Player } from '../packages/common/src/index.ts';

export function frame(
  movement: LocalMovement,
  source: WorldState,
  now: number,
  controls?: Partial<Player>,
) {
  const player = movement.render(source, now)!;
  Object.assign(player, controls);
  const view = structuredClone(source);
  const started = movement.animateAttack(player, view, now);
  movement.animateProjectiles(player, view, now, started);

  return { player, started, scene: (player.scene ? view.scene : view.training)! };
}
