import { TRANSIENT_EFFECTS } from "./definitions/effects/transient.ts";
import { BEAR_DEFINITION } from "./definitions/entities/companions.ts";
import { ENEMY_RULES, BOSS_DEFINITIONS } from "./definitions/entities/enemies.ts";
import { FOREST_ENCOUNTER } from "./definitions/encounters/forest.ts";
import { PICKUP_RULES } from "./definitions/entities/pickups.ts";
import { appendSceneEntities } from "./entities.ts";
import { ATTACK_DEFINITIONS } from "./definitions/abilities/attacks.ts";
import { RUNTIME } from "./definitions/runtime.ts";
import {
  hitEnemy,
  tickDebuffs,
  fireClassAttack,
  tickPlayerShots,
  defaultSpellRange,
} from "./class-combat.ts";
import { ENEMY_STATS, moveEnemies, spawnArchetype, enemyMaxHealth } from "./enemies.ts";
import {
  FOREST,
  forestDistance,
  forestTrees,
  wrappedDelta,
  moveForestActor,
  wrap,
  hasLivingScenePlayers,
} from "./scene.ts";
import { ARENA, moveActor, inTrainingZone } from "./world.ts";
import type { Player, Bear, ClientMessage } from "./index.ts";
import type { SceneState, Enemy } from "./scene.ts";

export const TICK_MS = RUNTIME.tickMs;
export const PLAYER_ATTACK_RANGE = defaultSpellRange({ classId: "warrior" });
export const PLAYER_ATTACK_INTERVAL = ATTACK_DEFINITIONS.slash.intervalMs;
export const PLAYER_ATTACK_DURATION = ATTACK_DEFINITIONS.slash.durationMs;
const swordHits = new WeakMap<object, { sceneId: string; at: number; enemies: Set<number> }>();
type CastRequest = Extract<ClientMessage, { type: "cast" }>;
const castInputs = new WeakMap<Player, CastRequest>();
const companionDecisions = new WeakMap<
  Bear,
  {
    at: number;
    scene: SceneState | undefined;
    forest: boolean;
    target: Enemy | undefined;
    following: boolean;
    destination: { x: number; y: number; hitpoints: number };
  }
>();

/** Frame-rate independent aim smoothing, always taking the shortest turn across ±pi. */
export function smoothAttackAngle(current: number | undefined, target: number, dt: number) {
  if (current === undefined) return target;
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const angle =
    current +
    difference * (1 - Math.exp(-Math.max(0, dt) / ATTACK_DEFINITIONS.slash.aimSmoothingSeconds));
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
    name: BEAR_DEFINITION.name,
    x: player.x,
    y: player.y,
    hitpoints: player.maxHitpoints * BEAR_DEFINITION.healthMultiplier,
    maxHitpoints: player.maxHitpoints * BEAR_DEFINITION.healthMultiplier,
    returning: false,
  });
  bear.moving = false;
  const max = player.maxHitpoints * BEAR_DEFINITION.healthMultiplier;
  if (bear.hitpoints > 0)
    bear.hitpoints = Math.min(max, bear.hitpoints + Math.max(0, max - bear.maxHitpoints));
  bear.maxHitpoints = max;
  if (bear.hitpoints <= 0) {
    companionDecisions.delete(bear);
    bear.resurrectAt ??= now + BEAR_DEFINITION.resurrectionMs;
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
  const distance = forestDistance(bear, player);
  if (distance > BEAR_DEFINITION.teleportRadius) {
    bear.x = player.x;
    bear.y = player.y;
    bear.returning = false;
    bear.attackAt = undefined;
    companionDecisions.delete(bear);
    return;
  }
  if (distance > BEAR_DEFINITION.huntRadius) bear.returning = true;
  if (bear.returning && distance <= BEAR_DEFINITION.returnRadius) bear.returning = false;
  let decision = companionDecisions.get(bear);
  if (
    !decision ||
    now - decision.at >= BEAR_DEFINITION.decisionMs ||
    decision.scene !== scene ||
    decision.forest !== forest
  ) {
    const target =
      (forest || scene?.training) && scene?.phase === "active" && !bear.returning
        ? scene.enemies
            .filter(
              (e) => e.hitpoints > 0 && forestDistance(e, player) <= BEAR_DEFINITION.huntRadius,
            )
            .reduce<Enemy | undefined>(
              (best, e) =>
                !best || forestDistance(bear, e) < forestDistance(bear, best) ? e : best,
              undefined,
            )
        : undefined;
    let destination: { x: number; y: number; hitpoints: number } = target ?? player;
    const heading = Math.atan2(
      wrappedDelta(destination.y, bear.y, FOREST.height),
      wrappedDelta(destination.x, bear.x, FOREST.width),
    );
    bear.attackAngle = heading;
    if (target) {
      // Keep claws in range while staying outside ordinary melee reach.
      const spacing = BEAR_DEFINITION.spacing;
      destination = {
        x: wrap(target.x - Math.cos(heading) * spacing, FOREST.width),
        y: wrap(target.y - Math.sin(heading) * spacing, FOREST.height),
        hitpoints: 1,
      };
    }
    const danger =
      forest && scene?.phase === "active"
        ? scene.enemies.find(
            (e) =>
              e.hitpoints > 0 &&
              e.attack &&
              e.attack.endsAt >= now &&
              forestDistance(bear, e.attack) < e.attack.radius + 12,
          )?.attack
        : undefined;
    if (danger) {
      const away =
        forestDistance(bear, danger) < 1
          ? heading + Math.PI
          : Math.atan2(
              wrappedDelta(bear.y, danger.y, FOREST.height),
              wrappedDelta(bear.x, danger.x, FOREST.width),
            );
      destination = {
        x: wrap(danger.x + Math.cos(away) * (danger.radius + 16), FOREST.width),
        y: wrap(danger.y + Math.sin(away) * (danger.radius + 16), FOREST.height),
        hitpoints: 1,
      };
    }
    if (forest && scene?.phase === "active") {
      const shot = scene.projectiles?.find((s) => {
        const dx = wrappedDelta(bear.x, s.x, FOREST.width),
          dy = wrappedDelta(bear.y, s.y, FOREST.height);
        const speedSquared = s.vx * s.vx + s.vy * s.vy;
        if (s.expiresAt <= now || speedSquared === 0) return false;
        const time = (dx * s.vx + dy * s.vy) / speedSquared;
        return (
          time >= 0 &&
          time <= Math.min(0.35, (s.expiresAt - now) / 1000) &&
          Math.hypot(dx - s.vx * time, dy - s.vy * time) < 30
        );
      });
      if (shot) {
        const speed = Math.hypot(shot.vx, shot.vy);
        const side =
          wrappedDelta(bear.x, shot.x, FOREST.width) * -shot.vy +
            wrappedDelta(bear.y, shot.y, FOREST.height) * shot.vx >=
          0
            ? 1
            : -1;
        destination = {
          x: wrap(bear.x - (shot.vy / speed) * 40 * side, FOREST.width),
          y: wrap(bear.y + (shot.vx / speed) * 40 * side, FOREST.height),
          hitpoints: 1,
        };
      }
    }
    decision = {
      at: now,
      scene,
      forest,
      target,
      following: destination === player,
      destination: { ...destination },
    };
    companionDecisions.set(bear, decision);
  }
  const target =
    decision.target &&
    decision.target.hitpoints > 0 &&
    scene?.phase === "active" &&
    scene.enemies.includes(decision.target) &&
    forestDistance(decision.target, player) <= BEAR_DEFINITION.huntRadius
      ? decision.target
      : undefined;
  const destination =
    bear.returning || decision.following || (decision.target && !target)
      ? player
      : decision.destination;
  const heading = Math.atan2(
    wrappedDelta(destination.y, bear.y, FOREST.height),
    wrappedDelta(destination.x, bear.x, FOREST.width),
  );
  const startX = bear.x,
    startY = bear.y;
  const destinationDistance = forestDistance(bear, destination);
  if (destination !== player || destinationDistance > BEAR_DEFINITION.returnRadius) {
    const speed = BEAR_DEFINITION.speed;
    if (forest) {
      const body: Enemy = {
        id: 1,
        x: bear.x,
        y: bear.y,
        hitpoints: bear.hitpoints,
        angle: heading,
        archetype: "runner",
      };
      moveEnemies([body], [destination], (dt * speed) / ENEMY_STATS.runner.speed, now);
      bear.x = body.x;
      bear.y = body.y;
    } else {
      const travel = Math.min(
        Math.max(
          0,
          destinationDistance - (destination === player ? BEAR_DEFINITION.returnRadius : 0),
        ),
        speed * Math.max(0, dt),
      );
      const next = moveActor(
        { x: bear.x, y: bear.y + 15 },
        Math.cos(heading) * travel,
        Math.sin(heading) * travel,
        12,
      );
      bear.x = next.x;
      bear.y = wrap(next.y - 15, ARENA.height);
    }
  }
  bear.moving = Math.hypot(bear.x - startX, bear.y - startY) > 0.001;
  if (bear.moving) bear.attackAngle = heading;
  if (target) bear.attackAngle = nearestEnemyAngle(bear, [target], heading);
  if (forestDistance(bear, player) > BEAR_DEFINITION.huntRadius && forest) bear.returning = true;
  if (!target || bear.returning || !scene) {
    bear.attackAt = undefined;
    return;
  }
  if (bear.attackAt === undefined || now - bear.attackAt >= PLAYER_ATTACK_INTERVAL)
    bear.attackAt = now;
  if (now - bear.attackAt < PLAYER_ATTACK_DURATION)
    slash(scene, bear, player, now, BEAR_DEFINITION.damage);
}

export function movePlayer(player: Player, x: number, y: number, dt: number) {
  if (player.hitpoints <= 0) return;
  const length = Math.max(1, Math.hypot(x, y));
  const next = (player.scene === "forest" ? moveForestActor : moveActor)(
    { x: player.x, y: player.y + 15 },
    (x / length) * ARENA.speed * dt,
    (y / length) * ARENA.speed * dt,
    12,
    false,
  );
  player.x = next.x;
  player.y = wrap(next.y - 15, player.scene === "forest" ? FOREST.height : ARENA.height);
}
export function stepCombat(scene: SceneState, players: Player[], now: number, dt: number) {
  const playerCount = players.filter((p) => p.scene === "forest").length;
  const additionalPlayers = Math.max(0, playerCount - 1);
  const healthScale = ENEMY_RULES.healthPerMember ** additionalPlayers;
  const healthRatio =
    healthScale / ENEMY_RULES.healthPerMember ** Math.max(0, (scene.playerCount ?? 1) - 1);
  if (healthRatio !== 1) {
    for (const enemy of [...scene.enemies, ...(scene.spawns ?? [])]) {
      enemy.maxHitpoints = enemyMaxHealth(enemy) * healthRatio;
      enemy.hitpoints *= healthRatio;
    }
  }
  scene.playerCount = playerCount;
  if (!hasLivingScenePlayers(players)) {
    scene.pausedAt ??= now;
    return;
  }
  if (scene.pausedAt !== undefined) {
    const delay = Math.max(0, now - scene.pausedAt);
    // Keep every combat deadline's remaining duration when the scene resumes.
    const keys = [
      "at",
      "endsAt",
      "nextSpawn",
      "warnedAt",
      "spawnsAt",
      "expiresAt",
      "nextTick",
      "startedAt",
      "cooldownUntil",
      "attackAt",
      "hurtAt",
      "resurrectAt",
    ] as const;
    const shift = (value: Partial<Record<(typeof keys)[number], number | null>>) => {
      for (const key of keys) if (typeof value[key] === "number") value[key] += delay;
    };
    shift(scene);
    for (const enemy of [...scene.enemies, ...(scene.spawns ?? [])]) {
      shift(enemy);
      if (enemy.attack) shift(enemy.attack);
      for (const debuff of enemy.debuffs ?? []) shift(debuff);
    }
    for (const event of [
      ...scene.damage,
      ...(scene.drops ?? []),
      ...(scene.projectiles ?? []),
      ...(scene.explosions ?? []),
    ])
      shift(event);
    for (const player of players.filter((p) => p.scene === "forest" && p.hitpoints <= 0)) {
      // New arrivals already use the current server clock.
      shift(player);
      if (player.bear) shift(player.bear);
    }
    scene.pausedAt = undefined;
  }
  const collectors = players.filter((p) => p.scene === "forest" && p.hitpoints > 0);
  scene.drops = (scene.drops ?? []).filter((drop) => {
    if (now - drop.at >= PICKUP_RULES.lifetimeMs) return false;
    if (now - drop.at < PICKUP_RULES.initialHopMs) return true;
    let target: Player | undefined;
    let distance = PICKUP_RULES.attractionRadius as number;
    for (const player of collectors) {
      const next = forestDistance(player, drop);
      if (next < distance) {
        target = player;
        distance = next;
      }
    }
    if (!target) return true;
    const travel = Math.min(distance, PICKUP_RULES.speed * Math.max(0, dt));
    if (distance <= PICKUP_RULES.collectRadius || distance - travel <= PICKUP_RULES.collectRadius) {
      if (drop.kind === "experience")
        for (const player of collectors) player.experience += drop.amount ?? 1;
      return false;
    }
    drop.x = wrap(
      drop.x + (wrappedDelta(target.x, drop.x, FOREST.width) * travel) / distance,
      FOREST.width,
    );
    drop.y = wrap(
      drop.y + (wrappedDelta(target.y, drop.y, FOREST.height) * travel) / distance,
      FOREST.height,
    );
    return true;
  });
  for (const player of players.filter((p) => p.scene === "forest"))
    tickCompanion(player, scene, now, dt);
  if (scene.phase !== "active") return;
  scene.spawns ??= [];
  scene.projectiles ??= [];
  const alive = players.filter((p) => p.scene === "forest" && p.hitpoints > 0);
  const spawnBoss = now >= scene.endsAt! && scene.bossId === undefined;
  scene.damage = scene.damage.filter((d) => now - d.at < TRANSIENT_EFFECTS.damage.lifetimeMs);
  if (
    alive.length &&
    (spawnBoss ||
      (now >= scene.nextSpawn &&
        scene.enemies.length + scene.spawns.length <
          ENEMY_RULES.maxAlive - (scene.bossId === undefined ? 1 : 0)))
  ) {
    scene.nextSpawn = now + FOREST_ENCOUNTER.spawnIntervalMs;
    const target = alive[scene.sequence % alive.length];
    // Reserve one slot for the boss. Search additional clear positions only for this mandatory spawn.
    for (
      let attempt = 0;
      attempt < (spawnBoss ? FOREST_ENCOUNTER.bossPlacementAttempts : 1);
      attempt++
    ) {
      const angle = (scene.sequence + attempt) * FOREST_ENCOUNTER.spawnAngleStep;
      const radius =
        FOREST_ENCOUNTER.spawnRadius +
        Math.floor(attempt / FOREST_ENCOUNTER.spawnRingAttempts) *
          FOREST_ENCOUNTER.spawnRingSpacing;
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
      const kind = spawnBoss
        ? "boss"
        : scene.spawnCount % ENEMY_RULES.eliteEvery === 0
          ? "elite"
          : "normal";
      const id = ++scene.sequence;
      const archetype = spawnBoss
        ? BOSS_DEFINITIONS[FOREST_ENCOUNTER.boss].archetype
        : spawnArchetype(Math.random(), scene.spawnCount);
      const hitpoints = enemyMaxHealth({ kind, archetype }) * healthScale;
      appendSceneEntities(scene, "spawns", {
        id,
        ...position,
        hitpoints,
        maxHitpoints: hitpoints,
        kind,
        name: spawnBoss ? BOSS_DEFINITIONS[FOREST_ENCOUNTER.boss].name : undefined,
        archetype,
        angle: 0,
        warnedAt: now,
        spawnsAt: now + ENEMY_RULES.spawnWarningMs,
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
      spawn.spawnsAt = now + FOREST_ENCOUNTER.blockedSpawnRetryMs;
      return true;
    }
    const { spawnsAt: _at, warnedAt: _warned, ...enemy } = spawn;
    appendSceneEntities(scene, "enemies", enemy);
    return false;
  });
  tickDebuffs(scene, players, now);
  tickPlayerCombat(scene, alive, now, dt);
  const combatants = [
    ...alive,
    ...alive.flatMap((p) => (p.bear && p.bear.hitpoints > 0 ? [p.bear] : [])),
  ];
  moveEnemies(scene.enemies, combatants, dt, now);
  const hurt = (target: Player | Bear, damage = ENEMY_RULES.damage) => {
    if (target.hitpoints <= 0 || now - (target.hurtAt ?? 0) < ENEMY_RULES.damageCooldownMs) return;
    target.hitpoints = Math.max(0, target.hitpoints - damage);
    target.hurtAt = now;
    if ("returning" in target && target.hitpoints === 0)
      target.resurrectAt = now + BEAR_DEFINITION.resurrectionMs;
    appendSceneEntities(scene, "damage", {
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
        if (scene.projectiles.length < ENEMY_RULES.maxAlive)
          appendSceneEntities(scene, "projectiles", {
            id: ++scene.sequence,
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * ENEMY_RULES.projectileSpeed,
            vy: Math.sin(angle) * ENEMY_RULES.projectileSpeed,
            expiresAt: now + ENEMY_RULES.projectileLifetimeMs,
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

export function playerAimAngle(player: Player, enemies: Enemy[]) {
  return player.autoTarget === false && player.aimX !== undefined && player.aimY !== undefined
    ? Math.atan2(
        wrappedDelta(player.aimY, player.y, FOREST.height),
        wrappedDelta(player.aimX, player.x, FOREST.width),
      )
    : nearestEnemyAngle(player, enemies, player.attackAngle);
}

/** Buffer slightly early requests for their due time; client IDs never bypass server cooldowns. */
export function requestPlayerCast(
  scene: SceneState | undefined,
  player: Player,
  request: CastRequest,
  now: number,
) {
  if (request.id <= (player.castSeq ?? 0)) return false;
  player.castSeq = request.id;
  if (
    !scene ||
    scene.phase !== "active" ||
    scene.pausedAt !== undefined ||
    player.hitpoints <= 0 ||
    request.classId !== (player.classId ?? "warrior") ||
    request.epoch !== (player.scene === "forest" ? scene.id : "lobby") ||
    (!player.scene && !inTrainingZone(player)) ||
    (player.attackAt !== undefined && now - player.attackAt < PLAYER_ATTACK_INTERVAL - 2 * TICK_MS)
  )
    return false;
  player.autoAttack = false;
  player.autoTarget = request.autoTarget;
  player.aimX = request.aimX;
  player.aimY = request.aimY;
  player.attackAt = Math.max(now, (player.attackAt ?? -Infinity) + PLAYER_ATTACK_INTERVAL);
  player.attackId = request.id;
  castInputs.set(player, request);
  return true;
}

export function tickPlayerCombat(scene: SceneState, alive: Player[], now: number, dt: number) {
  for (const player of alive) {
    if (scene.training && !inTrainingZone(player)) {
      player.attackAt = undefined;
      continue;
    }
    player.attackAngle = smoothAttackAngle(
      player.attackAngle,
      playerAimAngle(player, scene.enemies),
      dt,
    );
    const attacking = player.autoAttack !== false;
    if (
      attacking &&
      (player.attackAt === undefined || now - player.attackAt >= PLAYER_ATTACK_INTERVAL)
    ) {
      player.attackAt = now - ((now - (player.attackAt ?? now)) % PLAYER_ATTACK_INTERVAL);
      player.attackId = undefined;
    }
    if (player.attackAt === undefined) continue;
    const age = now - player.attackAt;
    if (age < 0 || age >= PLAYER_ATTACK_DURATION) continue;
    let swing = swordHits.get(player);
    const freshSwing = !swing || swing.at !== player.attackAt || swing.sceneId !== scene.id;
    if (freshSwing) {
      swing = { sceneId: scene.id, at: player.attackAt, enemies: new Set() };
      swordHits.set(player, swing);
    }
    if (player.classId === "ranger" || player.classId === "mage" || player.classId === "druid") {
      if (freshSwing) {
        const request = castInputs.get(player);
        fireClassAttack(
          scene,
          request && request.id === player.attackId
            ? {
                ...player,
                autoTarget: request.autoTarget,
                aimX: request.aimX,
                aimY: request.aimY,
              }
            : player,
          now,
        );
        castInputs.delete(player);
      }
      continue;
    }
    slash(scene, player, player, now, ATTACK_DEFINITIONS.slash.damage);
    if (!scene.training) scene.enemies = scene.enemies.filter((e) => e.hitpoints > 0);
  }
  tickPlayerShots(scene, alive, now, dt);
  if (!scene.training) scene.enemies = scene.enemies.filter((e) => e.hitpoints > 0);
}
