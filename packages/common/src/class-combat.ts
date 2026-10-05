import { FOREST, forestDistance, wrappedDelta, wrap } from "./scene.ts";
import { ENEMY_STATS } from "./enemies.ts";
import type { DebuffKind, Enemy, PlayerShot, SceneState } from "./scene.ts";
import type { Player } from "./index.ts";

const damageHistory = new WeakMap<Player, { at: number; amount: number }[]>();
export function damagePerSecond(player: Player, now: number) {
  const recent = (damageHistory.get(player) ?? []).filter((hit) => now - hit.at < 5000);
  damageHistory.set(player, recent);
  return recent.reduce((sum, hit) => sum + hit.amount, 0) / 5;
}

export function hitEnemy(
  scene: SceneState,
  enemy: Enemy,
  amount: number,
  owner: Player | undefined,
  now: number,
  ailment?: DebuffKind,
) {
  if (enemy.hitpoints <= 0) return;
  const dealt = Math.min(enemy.hitpoints, amount);
  enemy.hitpoints = Math.max(0, enemy.hitpoints - amount);
  if (owner) {
    const history = damageHistory.get(owner) ?? [];
    history.push({ at: now, amount: dealt });
    damageHistory.set(owner, history);
  }
  scene.damage.push({
    id: ++scene.sequence,
    x: enemy.x,
    y: enemy.y,
    amount: dealt,
    at: now,
    target: `enemy:${enemy.id}`,
    killed: enemy.hitpoints === 0,
    enemy:
      enemy.hitpoints === 0
        ? { archetype: enemy.archetype, kind: enemy.kind, angle: enemy.angle }
        : undefined,
  });
  if (enemy.hitpoints > 0 && ailment && owner && Math.random() < 0.1) {
    enemy.debuffs ??= [];
    let debuff = enemy.debuffs.find((d) => d.kind === ailment && d.expiresAt >= now);
    if (!debuff) {
      debuff = {
        kind: ailment,
        stacks: 0,
        expiresAt: now + 5000,
        nextTick: now + 1000,
        ownerId: owner.id,
      };
      enemy.debuffs = enemy.debuffs.filter((d) => d.kind !== ailment);
      enemy.debuffs.push(debuff);
    }
    debuff.stacks++;
    debuff.expiresAt = now + 5000;
    debuff.ownerId = owner.id;
  }
  if (enemy.hitpoints > 0 || scene.training) return;
  if (owner) owner.experience++;
  scene.drops ??= [];
  scene.drops.push({
    id: ++scene.sequence,
    kind: "experience",
    amount: 1.2 ** Math.max(0, (scene.playerCount ?? 1) - 1),
    x: enemy.x,
    y: enemy.y,
    at: now,
  });
  if (Math.random() < 0.1)
    scene.drops.push({
      id: ++scene.sequence,
      kind: "gold",
      x: wrap(enemy.x + 10, FOREST.width),
      y: enemy.y,
      at: now,
    });
  if (scene.drops.length > 512) scene.drops.splice(0, scene.drops.length - 512);
}

export function tickDebuffs(scene: SceneState, players: Player[], now: number) {
  for (const enemy of scene.enemies) {
    for (const debuff of enemy.debuffs ?? []) {
      if (debuff.kind === "roots") continue;
      while (debuff.nextTick <= Math.min(now, debuff.expiresAt) && enemy.hitpoints > 0) {
        hitEnemy(
          scene,
          enemy,
          debuff.stacks,
          players.find((p) => p.id === debuff.ownerId),
          now,
        );
        debuff.nextTick += 1000;
      }
    }
    enemy.debuffs = enemy.debuffs?.filter((d) => d.expiresAt > now);
  }
}

export function defaultSpellRange(player: Pick<Player, "classId" | "autoTarget">) {
  if (player.autoTarget === false && (player.classId === "mage" || player.classId === "druid"))
    return 1000;
  return player.classId === "mage" || player.classId === "druid"
    ? 250
    : player.classId === "ranger"
      ? 1000
      : 88;
}

function applyRoots(target: Enemy, ownerId: string, now: number) {
  if (target.kind === "boss") return;
  target.debuffs = (target.debuffs ?? []).filter((d) => d.kind !== "roots");
  target.debuffs.push({
    kind: "roots",
    stacks: 1,
    expiresAt: now + 5000,
    nextTick: now + 1000,
    ownerId,
  });
}

export function projectileAngle(aimAngle: number, index: number, count: number) {
  return aimAngle + (index - (count - 1) / 2) * (Math.PI / 30);
}

export function fireClassAttack(scene: SceneState, player: Player, now = 0) {
  const range = defaultSpellRange(player);
  const manual = player.autoTarget === false;
  const aim = { x: player.aimX ?? player.x, y: player.aimY ?? player.y };
  const targets = (manual ? [] : scene.enemies)
    .filter((e) => e.hitpoints > 0 && forestDistance(e, player) <= range)
    .sort((a, b) => forestDistance(a, player) - forestDistance(b, player))
    .slice(0, 1);
  scene.playerShots ??= [];
  const shotTargets: (Enemy | undefined)[] = manual ? [undefined] : targets;
  for (const target of shotTargets) {
    const destination = target ?? aim;
    const aimAngle = Math.atan2(
      wrappedDelta(destination.y, player.y, FOREST.height),
      wrappedDelta(destination.x, player.x, FOREST.width),
    );
    const count = player.classId === "druid" ? 1 : 2;
    for (let index = 0; index < count; index++) {
      scene.playerShots.push({
        id: ++scene.sequence,
        ownerId: player.id,
        castAt: player.attackAt ?? now,
        castId: player.attackId,
        kind:
          player.classId === "mage" ? "fireball" : player.classId === "druid" ? "roots" : "arrow",
        x: player.x,
        y: player.y,
        angle: projectileAngle(aimAngle, index, count),
        remaining: range,
        hitIds: [],
        targetId: target?.id,
        targetX: destination.x,
        targetY: destination.y,
      });
    }
  }
}

/** Shared projectile motion; the callback lets the server check piercing hits at each substep. */
export function advancePlayerShot(
  shot: PlayerShot,
  enemies: Enemy[],
  dt: number,
  onStep?: () => void,
  detectHits = true,
) {
  let travelLimit = shot.remaining;
  if (shot.kind === "roots" && shot.hitIds.length > 0) {
    const target = enemies.find((enemy) => enemy.id === shot.targetId && enemy.hitpoints > 0);
    if (!target) {
      shot.remaining = 0;
      return false;
    }
    const destination = target;
    shot.angle = Math.atan2(
      wrappedDelta(destination.y, shot.y, FOREST.height),
      wrappedDelta(destination.x, shot.x, FOREST.width),
    );
    shot.remaining = forestDistance(shot, destination) + 64;
    // Hold at the target while waiting for the next authoritative bounce.
    travelLimit = detectHits ? shot.remaining : forestDistance(shot, destination);
  }
  const distance = Math.min(travelLimit, Math.max(0, dt) * (shot.kind === "arrow" ? 600 : 380));
  const steps = Math.max(1, Math.ceil(distance / 6));
  for (let i = 0; i < steps; i++) {
    shot.x = wrap(shot.x + (Math.cos(shot.angle) * distance) / steps, FOREST.width);
    shot.y = wrap(shot.y + (Math.sin(shot.angle) * distance) / steps, FOREST.height);
    shot.remaining -= distance / steps;
    onStep?.();
    if (detectHits && shot.kind !== "arrow") {
      const hit = enemies.find(
        (enemy) =>
          enemy.hitpoints > 0 &&
          !shot.hitIds.includes(enemy.id) &&
          (shot.kind !== "roots" || shot.hitIds.length === 0 || enemy.id === shot.targetId) &&
          forestDistance(shot, enemy) <= ENEMY_STATS[enemy.archetype ?? "skeleton"].radius + 4,
      );
      if (hit) {
        shot.hitIds.push(hit.id);
        return true;
      }
    }
  }
  return false;
}

export function tickPlayerShots(scene: SceneState, players: Player[], now: number, dt: number) {
  scene.explosions = (scene.explosions ?? []).filter((e) => now - e.at < 350);
  scene.playerShots = (scene.playerShots ?? []).filter((shot) => {
    const owner = players.find(
      (p) =>
        p.id === shot.ownerId &&
        (scene.training ? !p.scene : p.scene === "forest") &&
        p.hitpoints > 0,
    );
    if (!owner) return false;
    const impacted = advancePlayerShot(shot, scene.enemies, dt, () => {
      if (shot.kind === "arrow") {
        for (const enemy of scene.enemies) {
          if (
            enemy.hitpoints <= 0 ||
            shot.hitIds.includes(enemy.id) ||
            forestDistance(shot, enemy) > ENEMY_STATS[enemy.archetype ?? "skeleton"].radius + 4
          )
            continue;
          shot.hitIds.push(enemy.id);
          hitEnemy(scene, enemy, 5, owner, now, "poison");
        }
      }
    });
    if (impacted) {
      if (shot.kind === "roots") {
        const target = scene.enemies.find((enemy) => enemy.id === shot.hitIds.at(-1));
        if (target) {
          hitEnemy(scene, target, 3, owner, now);
          if (target.hitpoints > 0) applyRoots(target, owner.id, now);
          if (shot.hitIds.length <= 3) {
            const next = scene.enemies
              .filter(
                (enemy) =>
                  enemy.hitpoints > 0 &&
                  !shot.hitIds.includes(enemy.id) &&
                  forestDistance(target, enemy) <= 250,
              )
              .reduce<Enemy | undefined>(
                (best, enemy) =>
                  !best || forestDistance(target, enemy) < forestDistance(target, best)
                    ? enemy
                    : best,
                undefined,
              );
            if (next) {
              shot.targetId = next.id;
              shot.targetX = next.x;
              shot.targetY = next.y;
              return true;
            }
          }
        }
        return false;
      }
      scene.explosions!.push({ id: ++scene.sequence, x: shot.x, y: shot.y, at: now });
      for (const enemy of scene.enemies)
        if (enemy.id === shot.hitIds[0]) hitEnemy(scene, enemy, 3, owner, now, "burn");
        else if (forestDistance(shot, enemy) <= 100) hitEnemy(scene, enemy, 1, owner, now, "burn");
      return false;
    }
    return shot.remaining > 0.001;
  });
}
