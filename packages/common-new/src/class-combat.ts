import { TRANSIENT_EFFECTS } from "./definitions/effects/transient.ts";
import { COLLISION } from "./definitions/collision.ts";
import { AILMENT_DEFINITIONS } from "./definitions/effects/ailments.ts";
import { PICKUP_DEFINITIONS, PICKUP_RULES } from "./definitions/entities/pickups.ts";
import { ENEMY_RULES } from "./definitions/entities/enemies.ts";
import { appendSceneEntities } from "./entities.ts";
import { ATTACK_DEFINITIONS } from "./definitions/abilities/attacks.ts";
import { PLAYER_DEFINITIONS } from "./definitions/entities/players.ts";
import { FOREST, forestDistance, wrappedDelta, wrap } from "./scene.ts";
import { enemyHitbox, overlapsBody } from "./hitboxes.ts";
import type { DebuffKind, Enemy, PlayerShot, SceneState } from "./scene.ts";
import type { Player } from "./index.ts";
import { characterStats } from "./equipment.ts";
import type { DamageType } from "./definitions/equipment.ts";

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
  damageType: DamageType = "physical",
  critical = false,
) {
  if (enemy.hitpoints <= 0) return;
  const dealt = Math.min(enemy.hitpoints, amount);
  enemy.hitpoints = Math.max(0, enemy.hitpoints - amount);
  if (owner) {
    const history = damageHistory.get(owner) ?? [];
    history.push({ at: now, amount: dealt });
    damageHistory.set(owner, history);
  }
  appendSceneEntities(scene, "damage", {
    id: ++scene.sequence,
    x: enemy.x,
    y: enemy.y,
    amount: dealt,
    ownerId: owner?.id,
    damageType,
    critical,
    at: now,
    target: `enemy:${enemy.id}`,
    killed: enemy.hitpoints === 0,
    enemy:
      enemy.hitpoints === 0
        ? { archetype: enemy.archetype, kind: enemy.kind, angle: enemy.angle }
        : undefined,
  });
  if (
    enemy.hitpoints > 0 &&
    ailment &&
    ailment !== "roots" &&
    owner &&
    Math.random() < AILMENT_DEFINITIONS[ailment].chance
  ) {
    enemy.debuffs ??= [];
    let debuff = enemy.debuffs.find((d) => d.kind === ailment && d.expiresAt >= now);
    if (!debuff) {
      debuff = {
        kind: ailment,
        stacks: 0,
        expiresAt: now + AILMENT_DEFINITIONS[ailment].durationMs,
        nextTick: now + AILMENT_DEFINITIONS[ailment].tickMs,
        ownerId: owner.id,
      };
      enemy.debuffs = enemy.debuffs.filter((d) => d.kind !== ailment);
      enemy.debuffs.push(debuff);
    }
    debuff.stacks++;
    debuff.expiresAt = now + AILMENT_DEFINITIONS[ailment].durationMs;
    debuff.ownerId = owner.id;
  }
  if (enemy.hitpoints > 0 || scene.training) return;
  if (owner) owner.experience++;
  scene.drops ??= [];
  appendSceneEntities(scene, "drops", {
    id: ++scene.sequence,
    kind: "experience",
    amount: ENEMY_RULES.experiencePerMember ** Math.max(0, (scene.playerCount ?? 1) - 1),
    x: enemy.x,
    y: enemy.y,
    at: now,
  });
  if (Math.random() < PICKUP_DEFINITIONS.gold.chance)
    appendSceneEntities(scene, "drops", {
      id: ++scene.sequence,
      kind: "gold",
      x: wrap(enemy.x + 10, FOREST.width),
      y: enemy.y,
      at: now,
    });
  if (scene.drops.length > PICKUP_RULES.capacity)
    scene.drops = scene.drops.slice(-PICKUP_RULES.capacity);
}

export function tickDebuffs(scene: SceneState, players: Player[], now: number) {
  for (const enemy of scene.enemies) {
    for (const debuff of enemy.debuffs ?? []) {
      if (debuff.kind === "roots") continue;
      while (debuff.nextTick <= Math.min(now, debuff.expiresAt) && enemy.hitpoints > 0) {
        hitEnemy(
          scene,
          enemy,
          debuff.stacks * AILMENT_DEFINITIONS[debuff.kind].damagePerStack,
          players.find((p) => p.id === debuff.ownerId),
          now,
          undefined,
          debuff.kind === "burn" ? "fire" : debuff.kind === "poison" ? "poison" : "physical",
        );
        debuff.nextTick += AILMENT_DEFINITIONS[debuff.kind].tickMs;
      }
    }
    enemy.debuffs = enemy.debuffs?.filter((d) => d.expiresAt > now);
  }
}

export function defaultSpellRange(player: Pick<Player, "classId" | "autoTarget" | "equipment">) {
  const stats = characterStats(player);
  if (!stats.hasWeapon) return 0;
  return player.autoTarget === false ? stats.manualRange : stats.range;
}

/** Called only by authoritative hit resolution, never by cast prediction. */
export function hitWithWeapon(
  scene: SceneState,
  enemy: Enemy,
  owner: Player,
  now: number,
  ailment?: DebuffKind,
  powerScale = 1,
) {
  if (enemy.hitpoints <= 0) return;
  const stats = characterStats(owner);
  if (!stats.hasWeapon) return;
  const critical = Math.random() < stats.criticalChance;
  hitEnemy(
    scene,
    enemy,
    stats.power * powerScale * (critical ? stats.criticalMultiplier : 1),
    owner,
    now,
    ailment,
    stats.damageType,
    critical,
  );
}

function applyRoots(target: Enemy, ownerId: string, now: number) {
  if (target.kind === "boss") return;
  target.debuffs = (target.debuffs ?? []).filter((d) => d.kind !== "roots");
  target.debuffs.push({
    kind: "roots",
    stacks: 1,
    expiresAt: now + AILMENT_DEFINITIONS.roots.durationMs,
    nextTick: now + 1000,
    ownerId,
  });
}

export function projectileAngle(aimAngle: number, index: number, count: number) {
  return aimAngle + (index - (count - 1) / 2) * ATTACK_DEFINITIONS.arrow.spreadRadians;
}

export function fireClassAttack(scene: SceneState, player: Player, now = 0) {
  if (!characterStats(player).hasWeapon) return;
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
    const attack = PLAYER_DEFINITIONS[player.classId ?? "ranger"].attack;
    const count = attack === "slash" ? 0 : ATTACK_DEFINITIONS[attack].count;
    for (let index = 0; index < count; index++) {
      appendSceneEntities(scene, "playerShots", {
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
) {
  if (shot.kind === "roots" && shot.hitIds.length === 1) {
    const target = enemies.find((enemy) => enemy.id === shot.targetId && enemy.hitpoints > 0);
    if (!target) {
      shot.remaining = 0;
      return false;
    }
    const destination = enemyHitbox(target);
    shot.angle = Math.atan2(
      wrappedDelta(destination.y, shot.y, FOREST.height),
      wrappedDelta(destination.x, shot.x, FOREST.width),
    );
    shot.remaining = forestDistance(shot, destination) + 64;
  }
  const distance = Math.min(shot.remaining, Math.max(0, dt) * ATTACK_DEFINITIONS[shot.kind].speed);
  const steps = Math.max(1, Math.ceil(distance / 6));
  for (let i = 0; i < steps; i++) {
    shot.x = wrap(shot.x + (Math.cos(shot.angle) * distance) / steps, FOREST.width);
    shot.y = wrap(shot.y + (Math.sin(shot.angle) * distance) / steps, FOREST.height);
    shot.remaining -= distance / steps;
    onStep?.();
    if (shot.kind !== "arrow") {
      const hit = enemies.find(
        (enemy) =>
          enemy.hitpoints > 0 &&
          !shot.hitIds.includes(enemy.id) &&
          (shot.kind !== "roots" || shot.hitIds.length === 0 || enemy.id === shot.targetId) &&
          overlapsBody(shot, COLLISION.playerProjectileRadius, enemyHitbox(enemy)),
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
  scene.explosions = (scene.explosions ?? []).filter(
    (e) => now - e.at < TRANSIENT_EFFECTS.explosion.lifetimeMs,
  );
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
            !overlapsBody(shot, COLLISION.playerProjectileRadius, enemyHitbox(enemy))
          )
            continue;
          shot.hitIds.push(enemy.id);
          hitWithWeapon(scene, enemy, owner, now, "poison");
        }
      }
    });
    if (impacted) {
      if (shot.kind === "roots") {
        const target = scene.enemies.find((enemy) => enemy.id === shot.hitIds.at(-1));
        if (target) {
          hitWithWeapon(scene, target, owner, now);
          if (target.hitpoints > 0) applyRoots(target, owner.id, now);
          if (shot.hitIds.length === 1) {
            const next = scene.enemies
              .filter((enemy) => enemy.hitpoints > 0 && !shot.hitIds.includes(enemy.id))
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
      appendSceneEntities(scene, "explosions", {
        id: ++scene.sequence,
        x: shot.x,
        y: shot.y,
        at: now,
      });
      for (const enemy of scene.enemies)
        if (enemy.id === shot.hitIds[0]) hitWithWeapon(scene, enemy, owner, now, "burn");
        else if (overlapsBody(shot, ATTACK_DEFINITIONS.fireball.splashRadius, enemyHitbox(enemy)))
          hitWithWeapon(scene, enemy, owner, now, "burn", 1 / 3);
      return false;
    }
    return shot.remaining > 0.001;
  });
}
