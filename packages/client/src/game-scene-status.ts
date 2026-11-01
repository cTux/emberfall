import {
  MILLISECONDS_PER_SECOND,
  hasLivingScenePlayers,
  type Player,
  type WorldState,
} from '@emberfall/common';

export function gameSceneStatus(world: WorldState | null, me: Player | undefined) {
  const scene = world?.scene;
  const boss =
    me?.scene === 'forest' && scene?.phase === 'active'
      ? scene.enemies.find((enemy) => {
          return enemy.id === scene.bossId && enemy.hitpoints > 0;
        })
      : undefined;
  const departure = Math.max(
    1,
    Math.ceil(((scene?.countdownAt ?? 0) - (world?.serverNow ?? 0)) / MILLISECONDS_PER_SECOND),
  );
  const remaining = Math.max(
    0,
    Math.ceil(
      ((scene?.endsAt ?? 0) - (scene?.pausedAt ?? world?.serverNow ?? 0)) / MILLISECONDS_PER_SECOND,
    ),
  );
  const canRegenerate =
    !!scene &&
    ['active', 'ended'].includes(scene.phase) &&
    !hasLivingScenePlayers(
      world?.players.filter((p) => {
        return p.runId === (me?.scene ? me.runId : me?.homeRunId);
      }) ?? [],
    );

  return { boss, departure, remaining, canRegenerate };
}
