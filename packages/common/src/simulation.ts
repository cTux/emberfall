import { hitEnemy, tickDebuffs, fireClassAttack, tickPlayerShots } from "./class-combat.ts";
import { ENEMY_STATS, moveEnemies, spawnArchetype, enemyMaxHealth } from "./enemies.ts";
import {
  FOREST,
  forestDistance,
  forestTrees,
  wrappedDelta,
  moveForestActor,
  wrap,
} from "./scene.ts";
import { ARENA, moveActor } from "./world.ts";
import type { Player, Bear } from "./index.ts";
import type { SceneState, Enemy } from "./scene.ts";

export const TICK_MS = 50;
export const PLAYER_ATTACK_RANGE = 88;
export const PLAYER_ATTACK_INTERVAL = 700;
export const PLAYER_ATTACK_DURATION = 260;
const swordHits = new WeakMap<object, { sceneId: string; at: number; enemies: Set<number> }>();

/** Frame-rate independent aim smoothing, always taking the shortest turn across ±pi. */
export function smoothAttackAngle(current: number | undefined, target: number, dt: number) {
  if (current === undefined) return target;
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const angle = current + difference * (1 - Math.exp(-Math.max(0, dt) / 0.08));
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function nearestEnemyAngle(
  player: { x: number; y: number },
  enemies: Enemy[],
  fallback = 0,
) {
  const closest = enemies
    .filter((e) => e.hitpoints > 0)
    .reduce<Enemy | undefined>(
      (best, enemy) =>
        !best || forestDistance(enemy, player) < forestDistance(best, player) ? enemy : best,
      undefined,
    );
  return closest
    ? Math.atan2(
        wrappedDelta(closest.y, player.y, FOREST.height),
        wrappedDelta(closest.x, player.x, FOREST.width),
      )
    : fallback;
}

export function swordOverlapsEnemy(player: Pick<Player, "x" | "y" | "attackAngle">, enemy: Enemy) {
  const dx = wrappedDelta(enemy.x, player.x, FOREST.width),
    dy = wrappedDelta(enemy.y, player.y, FOREST.height);
  const angle = player.attackAngle ?? 0;
  const forward = dx * Math.cos(angle) + dy * Math.sin(angle);
  const sideways = -dx * Math.sin(angle) + dy * Math.cos(angle);
  // Distance from the enemy's collision circle to the filled forward half-disc.
  const distance =
    forward >= 0
      ? Math.max(0, Math.hypot(dx, dy) - PLAYER_ATTACK_RANGE)
      : Math.hypot(forward, Math.max(0, Math.abs(sideways) - PLAYER_ATTACK_RANGE));
  return distance <= ENEMY_STATS[enemy.archetype ?? "skeleton"].radius + 1e-6;
}

function slash(
  scene: SceneState,
  actor: Player | Bear,
  owner: Player,
  now: number,
  amount: number,
) {
  let swing = swordHits.get(actor);
  if (!swing || swing.at !== actor.attackAt || swing.sceneId !== scene.id) {
    swing = { sceneId: scene.id, at: actor.attackAt!, enemies: new Set() };
    swordHits.set(actor, swing);
  }
  for (const enemy of scene.enemies) {
    if (enemy.hitpoints <= 0 || swing.enemies.has(enemy.id) || !swordOverlapsEnemy(actor, enemy))
      continue;
    swing.enemies.add(enemy.id);
    hitEnemy(scene, enemy, amount, owner, now, amount === 5 ? "bleed" : undefined);
  }
}

export function tickCompanion(
  player: Player,
  scene: SceneState | undefined,
  now: number,
  dt: number,
) {
  if (player.classId !== "druid") {
    player.bear = undefined;
    return;
  }
  const bear = (player.bear ??= {
    id: `bear:${player.id}`,
    name: "Bear",
    x: player.x,
    y: player.y,
    hitpoints: player.maxHitpoints * 1.5,
    maxHitpoints: player.maxHitpoints * 1.5,
    returning: false,
  });
  const max = player.maxHitpoints * 1.5;
  if (bear.hitpoints > 0)
    bear.hitpoints = Math.min(max, bear.hitpoints + Math.max(0, max - bear.maxHitpoints));
  bear.maxHitpoints = max;
  if (bear.hitpoints <= 0) {
    bear.resurrectAt ??= now + 5000;
    if (now < bear.resurrectAt) return;
    bear.hitpoints = max;
    bear.x = player.x;
    bear.y = player.y;
    bear.resurrectAt = undefined;
    bear.hurtAt = undefined;
    bear.attackAt = undefined;
    bear.returning = false;
  }
  if (player.hitpoints <= 0) return;
  const forest = player.scene === "forest";
  const distance = forest
    ? forestDistance(bear, player)
    : Math.hypot(bear.x - player.x, bear.y - player.y);
  if (distance > 100) bear.returning = true;
  if (bear.returning && distance <= 20) bear.returning = false;
  const target =
    forest && scene?.phase === "active" && !bear.returning
      ? scene.enemies
          .filter((e) => e.hitpoints > 0)
          .reduce<Enemy | undefined>(
            (best, e) => (!best || forestDistance(bear, e) < forestDistance(bear, best) ? e : best),
            undefined,
          )
      : undefined;
  const destination = target ?? player;
  const heading = Math.atan2(
    forest ? wrappedDelta(destination.y, bear.y, FOREST.height) : destination.y - bear.y,
    forest ? wrappedDelta(destination.x, bear.x, FOREST.width) : destination.x - bear.x,
  );
  bear.attackAngle = heading;
  if (target || distance > 20) {
    if (forest) {
      const body: Enemy = {
        id: 1,
        x: bear.x,
        y: bear.y,
        hitpoints: bear.hitpoints,
        angle: heading,
        archetype: "runner",
      };
      moveEnemies([body], [destination], dt * 2.5, now);
      bear.x = body.x;
      bear.y = body.y;
    } else {
      const travel = Math.min(Math.max(0, distance - 20), 260 * Math.max(0, dt));
      const next = moveActor(
        { x: bear.x, y: bear.y + 15 },
        Math.cos(heading) * travel,
        Math.sin(heading) * travel,
        12,
      );
      bear.x = next.x;
      bear.y = next.y - 15;
    }
  }
  if (forestDistance(bear, player) > 100 && forest) bear.returning = true;
  if (!target || bear.returning || !scene) {
    bear.attackAt = undefined;
    return;
  }
  if (bear.attackAt === undefined || now - bear.attackAt >= PLAYER_ATTACK_INTERVAL)
    bear.attackAt = now;
  if (now - bear.attackAt < PLAYER_ATTACK_DURATION) slash(scene, bear, player, now, 2);
}

export function movePlayer(player: Player, x: number, y: number, dt: number) {
  if (player.hitpoints <= 0) return;
  const length = Math.max(1, Math.hypot(x, y));
  const next = (player.scene === "forest" ? moveForestActor : moveActor)(
    { x: player.x, y: player.y + 15 },
    (x / length) * ARENA.speed * dt,
    (y / length) * ARENA.speed * dt,
    12,
  );
  player.x = next.x;
  player.y = player.scene === "forest" ? wrap(next.y - 15, FOREST.height) : next.y - 15;
}
export function stepCombat(scene: SceneState, players: Player[], now: number, dt: number) {
  // Pickups are shared visual objects only: collecting them grants no reward yet.
  const collectors = players.filter((p) => p.scene === "forest" && p.hitpoints > 0);
  scene.drops = (scene.drops ?? []).filter((drop) => {
    if (now - drop.at >= 60000) return false;
    if (now - drop.at < 300) return true;
    let target: Player | undefined;
    let distance = 140;
    for (const player of collectors) {
      const next = forestDistance(player, drop);
      if (next < distance) {
        target = player;
        distance = next;
      }
    }
    if (!target) return true;
    if (distance <= 22) return false;
    const travel = Math.min(distance, 280 * Math.max(0, dt));
    drop.x = wrap(
      drop.x + (wrappedDelta(target.x, drop.x, FOREST.width) * travel) / distance,
      FOREST.width,
    );
    drop.y = wrap(
      drop.y + (wrappedDelta(target.y, drop.y, FOREST.height) * travel) / distance,
      FOREST.height,
    );
    return distance - travel > 22;
  });
  for (const player of players.filter((p) => p.scene === "forest"))
    tickCompanion(player, scene, now, dt);
  if (scene.phase !== "active") return;
  scene.spawns ??= [];
  scene.projectiles ??= [];
  const alive = players.filter((p) => p.scene === "forest" && p.hitpoints > 0);
  const spawnBoss = now >= scene.endsAt! && scene.bossId === undefined;
  scene.damage = scene.damage.filter((d) => now - d.at < 800);
  if (
    alive.length &&
    (spawnBoss ||
      (now >= scene.nextSpawn &&
        scene.enemies.length + scene.spawns.length < (scene.bossId === undefined ? 159 : 160)))
  ) {
    scene.nextSpawn = now + 400;
    const target = alive[scene.sequence % alive.length];
    // Reserve one slot for the boss. Search additional clear positions only for this mandatory spawn.
    for (let attempt = 0; attempt < (spawnBoss ? 256 : 1); attempt++) {
      const angle = (scene.sequence + attempt) * 2.399963;
      const radius = 340 + Math.floor(attempt / 32) * 40;
      const position = {
        x: wrap(target.x + Math.cos(angle) * radius, FOREST.width),
        y: wrap(target.y + Math.sin(angle) * radius, FOREST.height),
      };
      const clear =
        forestTrees(position.x, position.y + 15, 40).every(
          (t) => Math.hypot(position.x - t.x, position.y + 15 - t.y) >= 31,
        ) && [...scene.enemies, ...scene.spawns].every((e) => forestDistance(e, position) >= 32);
      if (!clear) continue;
      scene.spawnCount = (scene.spawnCount ?? 0) + 1;
      const kind = spawnBoss ? "boss" : scene.spawnCount % 10 === 0 ? "elite" : "normal";
      const id = ++scene.sequence;
      const archetype = spawnBoss ? "brute" : spawnArchetype(Math.random(), scene.spawnCount);
      scene.spawns.push({
        id,
        ...position,
        hitpoints: enemyMaxHealth({ kind, archetype }),
        maxHitpoints: enemyMaxHealth({ kind, archetype }),
        kind,
        name: spawnBoss ? "The Hollow Warden" : undefined,
        archetype,
        angle: 0,
        warnedAt: now,
        spawnsAt: now + 1000,
      });
      if (spawnBoss) scene.bossId = id;
      break;
    }
    // Vary the next attempt even when a normal spawn was blocked.
    scene.sequence++;
  }
  scene.spawns = scene.spawns.filter((spawn) => {
    if (now < spawn.spawnsAt) return true;
    if (
      scene.enemies.some(
        (e) =>
          forestDistance(e, spawn) <
          ENEMY_STATS[e.archetype ?? "skeleton"].radius +
            ENEMY_STATS[spawn.archetype ?? "skeleton"].radius,
      )
    ) {
      spawn.spawnsAt = now + 250;
      return true;
    }
    const { spawnsAt: _at, warnedAt: _warned, ...enemy } = spawn;
    scene.enemies.push(enemy);
    return false;
  });
  tickDebuffs(scene, players, now);
  for (const player of alive) {
    player.attackAngle = smoothAttackAngle(
      player.attackAngle,
      nearestEnemyAngle(player, scene.enemies, player.attackAngle),
      dt,
    );
    if (player.attackAt === undefined || now - player.attackAt >= PLAYER_ATTACK_INTERVAL)
      player.attackAt = now - ((now - (player.attackAt ?? now)) % PLAYER_ATTACK_INTERVAL);
    const age = now - player.attackAt;
    if (age < 0 || age >= PLAYER_ATTACK_DURATION) continue;
    let swing = swordHits.get(player);
    const freshSwing = !swing || swing.at !== player.attackAt || swing.sceneId !== scene.id;
    if (freshSwing) {
      swing = { sceneId: scene.id, at: player.attackAt, enemies: new Set() };
      swordHits.set(player, swing);
    }
    if (player.classId === "ranger" || player.classId === "mage" || player.classId === "druid") {
      if (freshSwing) fireClassAttack(scene, player, now);
      continue;
    }
    slash(scene, player, player, now, 5);
    scene.enemies = scene.enemies.filter((e) => e.hitpoints > 0);
  }
  tickPlayerShots(scene, players, now, dt);
  scene.enemies = scene.enemies.filter((e) => e.hitpoints > 0);
  const combatants = [
    ...alive,
    ...alive.flatMap((p) => (p.bear && p.bear.hitpoints > 0 ? [p.bear] : [])),
  ];
  moveEnemies(scene.enemies, combatants, dt, now);
  const hurt = (target: Player | Bear, damage = 10) => {
    if (target.hitpoints <= 0 || now - (target.hurtAt ?? 0) < 1000) return;
    target.hitpoints = Math.max(0, target.hitpoints - damage);
    target.hurtAt = now;
    if ("returning" in target && target.hitpoints === 0) target.resurrectAt = now + 5000;
    scene.damage.push({
      id: ++scene.sequence,
      x: target.x,
      y: target.y,
      amount: damage,
      at: now,
      target: target.id,
    });
  };
  for (const enemy of scene.enemies) {
    const stats = ENEMY_STATS[enemy.archetype ?? "skeleton"];
    const target = combatants
      .filter((p) => p.hitpoints > 0)
      .reduce<Player | Bear | undefined>(
        (best, p) => (!best || forestDistance(p, enemy) < forestDistance(best, enemy) ? p : best),
        undefined,
      );
    if (enemy.attack) {
      const attack = enemy.attack;
      if (now < attack.endsAt) continue;
      enemy.attack = undefined;
      const inRange = target && forestDistance(enemy, target) <= stats.reach;
      enemy.cooldownUntil = now + (inRange ? stats.cooldown : 150);
      if (!inRange) continue;
      if (attack.ranged) {
        const angle = Math.atan2(
          wrappedDelta(attack.y, enemy.y, FOREST.height),
          wrappedDelta(attack.x, enemy.x, FOREST.width),
        );
        if (scene.projectiles.length < 160)
          scene.projectiles.push({
            id: ++scene.sequence,
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * 210,
            vy: Math.sin(angle) * 210,
            expiresAt: now + 2500,
          });
      } else {
        for (const player of combatants)
          if (forestDistance(player, attack) <= attack.radius) hurt(player);
      }
    } else if (
      target &&
      now >= (enemy.cooldownUntil ?? 0) &&
      forestDistance(enemy, target) <= stats.reach
    ) {
      const ranged = enemy.archetype === "caster";
      enemy.attack = {
        startedAt: now,
        endsAt: now + stats.windup,
        x: ranged ? target.x : enemy.x,
        y: ranged ? target.y : enemy.y,
        radius: ranged ? 22 : stats.reach,
        ranged,
      };
    }
  }
  scene.projectiles = scene.projectiles.filter((shot) => {
    if (now >= shot.expiresAt) return false;
    const steps = Math.max(1, Math.ceil((Math.hypot(shot.vx, shot.vy) * dt) / 6));
    for (let i = 0; i < steps; i++) {
      shot.x = wrap(shot.x + (shot.vx * dt) / steps, FOREST.width);
      shot.y = wrap(shot.y + (shot.vy * dt) / steps, FOREST.height);
      if (
        forestTrees(shot.x, shot.y + 15, 24).some(
          (t) => Math.hypot(shot.x - t.x, shot.y + 15 - t.y) < 20,
        )
      )
        return false;
      const hit = combatants.find((p) => p.hitpoints > 0 && forestDistance(p, shot) <= 17);
      if (hit) {
        hurt(hit);
        return false;
      }
    }
    return true;
  });
  if (
    scene.bossId !== undefined &&
    !scene.enemies.some((e) => e.id === scene.bossId) &&
    !scene.spawns.some((e) => e.id === scene.bossId)
  ) {
    scene.phase = "ended";
    scene.enemies = [];
    scene.spawns = [];
    scene.projectiles = [];
    scene.playerShots = [];
    scene.portals = players
      .filter((p) => p.scene === "forest")
      .map((p) => ({ x: p.x, y: p.y + 15 }));
  }
}
