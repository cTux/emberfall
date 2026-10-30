import type { DebuffKind, Enemy, Player, SceneState } from '@emberfall/common';
import { appendSceneEntities, wrap, wrappedDelta } from '@emberfall/common';
import { forestDistance, FOREST } from './scene.ts';
import { TALENT_NAMES, talentNodeId, talentRank } from './talent-tree.ts';
import { hitEnemy } from './class-combat.ts';
import { characterStats } from './equipment.ts';
import type { CharacterStats } from './content/rules.ts';
import { isChanced } from './utils/isChanced.ts';

export function rank(player: Player, column: number, row: number) {
  return talentRank(player, talentNodeId(player.classId ?? 'warrior', column, row));
}
interface FighterState {
  stats?: CharacterStats;
  scene: SceneState;
  classId: string;
  hits: number;
  guardUntil: number;
  guardReadyAt: number;
  barrier: number;
  barrierUntil: number;
  wallUntil: number;
  wallRank: number;
  reprisalAt: number;
  sequence: { slot: number; at: number }[];
  rhythmAt: number;
  fissure?: { x: number; y: number; until: number };
  empoweredUntil?: number;
  wallPrevented?: boolean;
  rebirthAt?: number;
  challengeHits?: Set<number>;
}
const fighters = new WeakMap<Player, FighterState>();
const generations = new WeakMap<Player, number>();
export function clearTalentEffects(player: Player) {
  fighters.delete(player);
  generations.set(player, (generations.get(player) ?? 0) + 1);
}
const deepCuts = new WeakMap<Enemy, WeakMap<Player, number>>();
function state(player: Player, scene: SceneState): FighterState {
  let value = fighters.get(player);
  if (!value || value.scene !== scene || value.classId !== (player.classId ?? 'warrior')) {
    value = {
      scene,
      classId: player.classId ?? 'warrior',
      hits: 0,
      guardUntil: 0,
      guardReadyAt: 0,
      barrier: 0,
      barrierUntil: 0,
      wallUntil: 0,
      wallRank: 0,
      reprisalAt: 0,
      sequence: [],
      rhythmAt: 0,
    };
    fighters.set(player, value);
  }
  return value;
}
interface Scheduled {
  generation: number;
  at: number;
  until: number;
  interval: number;
  owner: Player;
  classId: string;
  nodeId: string;
  run: (at: number, players: Player[]) => void;
}
const scheduled = new WeakMap<SceneState, Scheduled[]>();
function schedule(
  scene: SceneState,
  owner: Player,
  nodeId: string,
  at: number,
  duration: number,
  interval: number,
  run: Scheduled['run'],
) {
  const entries = scheduled.get(scene) ?? [];
  entries.push({
    generation: generations.get(owner) ?? 0,
    at,
    until: at + duration,
    interval,
    owner,
    classId: owner.classId ?? 'warrior',
    nodeId,
    run,
  });
  scheduled.set(scene, entries);
}
export function tickTalentEffects(scene: SceneState, players: Player[], now: number) {
  if (scene.pausedAt !== undefined || scene.phase !== 'active') return;
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
      )
        return false;
      while (entry.at <= now && entry.at <= entry.until) {
        entry.run(entry.at, players);
        entry.at += entry.interval;
      }
      return entry.at <= entry.until;
    }),
  );
}
export function shiftTalentEffects(scene: SceneState, players: Player[], delay: number) {
  for (const entry of scheduled.get(scene) ?? []) {
    entry.at += delay;
    entry.until += delay;
  }
  for (const player of players) {
    const value = fighters.get(player);
    if (!value || value.scene !== scene) continue;
    for (const key of [
      'guardUntil',
      'guardReadyAt',
      'barrierUntil',
      'wallUntil',
      'reprisalAt',
      'rhythmAt',
    ] as const)
      value[key] += delay;
    if (value.fissure) value.fissure.until += delay;
    if (value.empoweredUntil) value.empoweredUntil += delay;
    for (const entry of value.sequence) entry.at += delay;
  }
}
export function talentVisual(
  scene: SceneState,
  player: Player,
  column: number,
  point: { x: number; y: number },
  now: number,
) {
  appendSceneEntities(scene, 'explosions', {
    ownerId: player.id,
    id: ++scene.sequence,
    x: point.x,
    y: point.y,
    at: now,
    talentClass: player.classId ?? 'warrior',
    talentColumn: column,
    durationMs: 1000,
  });
}
export function applyTalentAilment(
  enemy: Enemy,
  player: Player,
  kind: DebuffKind,
  stacks: number,
  now: number,
  duration = 5000,
) {
  if (enemy.hitpoints <= 0 || (kind === 'roots' && enemy.kind === 'boss')) return;
  enemy.debuffs ??= [];
  let entry = enemy.debuffs.find(
    (value) => value.kind === kind && value.ownerId === player.id && value.expiresAt > now,
  );
  if (!entry) {
    entry = {
      kind,
      stacks: 0,
      ownerId: player.id,
      nextTick: now + 1000,
      expiresAt: now + duration,
    };
    enemy.debuffs.push(entry);
  }
  entry.stacks = kind === 'roots' ? 1 : Math.min(5, entry.stacks + stacks);
  entry.expiresAt = now + duration;
}
function area(scene: SceneState, point: { x: number; y: number }, radius: number, player?: Player) {
  radius *= 1 + (player ? characterStats(player).bonuses.areaOfEffect / 100 : 0);
  return scene.enemies.filter(
    (enemy) => enemy.hitpoints > 0 && forestDistance(point, enemy) <= radius,
  );
}
function control(enemy: Enemy, now: number, duration: number) {
  if (enemy.kind === 'boss') return;
  enemy.controlledUntil = Math.max(enemy.controlledUntil ?? 0, now + duration);
  enemy.attack = undefined;
}
function strike(
  scene: SceneState,
  player: Player,
  enemy: Enemy,
  scale: number,
  now: number,
  source: string,
) {
  const stats = state(player, scene).stats ?? characterStats(player);
  const critical = isChanced(stats.criticalChance * 100);
  hitEnemy(
    scene,
    enemy,
    stats.power * scale * (critical ? stats.criticalMultiplier : 1),
    player,
    now,
    undefined,
    stats.damageType,
    critical,
    source,
  );
}
type HealingTarget = Pick<Player, 'x' | 'y' | 'hitpoints' | 'maxHitpoints'>;
function heal(player: HealingTarget, fraction: number) {
  player.hitpoints = Math.min(
    player.maxHitpoints,
    player.hitpoints + player.maxHitpoints * fraction,
  );
}
function healingTarget(
  players: Player[],
  owner: Player,
  point: { x: number; y: number },
  radius: number,
) {
  let target: HealingTarget | undefined;
  for (const ally of players) {
    if (
      (ally !== owner && (!owner.partyId || ally.partyId !== owner.partyId)) ||
      ally.scene !== owner.scene ||
      ally.runId !== owner.runId ||
      ally.reconnecting
    )
      continue;
    for (const candidate of [ally, ally.bear]) {
      if (
        !candidate ||
        candidate.hitpoints <= 0 ||
        candidate.hitpoints >= candidate.maxHitpoints ||
        forestDistance(candidate, point) > radius
      )
        continue;
      if (
        !target ||
        candidate.hitpoints / candidate.maxHitpoints < target.hitpoints / target.maxHitpoints
      )
        target = candidate;
    }
  }
  return target;
}
function shield(player: Player, scene: SceneState, amount: number, until: number) {
  const value = state(player, scene);
  value.barrier = Math.max(value.barrier, amount);
  value.barrierUntil = Math.max(value.barrierUntil, until);
}
export function talentIncomingDamage(
  scene: SceneState,
  player: Player,
  amount: number,
  now: number,
) {
  const value = state(player, scene);
  let prevented = 0;
  if (value.guardUntil > now) {
    const reduction = rank(player, 2, 0) === 2 ? 0.6 : 0.4;
    prevented += amount * reduction;
    amount *= 1 - reduction;
    value.guardUntil = 0;
  }
  if (value.wallUntil > now) {
    value.wallPrevented = true;
    const reduction = value.wallRank === 2 ? 0.75 : 0.6;
    prevented += amount * reduction;
    amount *= 1 - reduction;
  }
  if (value.barrierUntil > now && value.barrier > 0) {
    const absorbed = Math.min(value.barrier, amount);
    value.barrier -= absorbed;
    amount -= absorbed;
    prevented += absorbed;
  }
  const retaliation = rank(player, 2, 6);
  if (prevented > 0 && retaliation && now >= value.reprisalAt) {
    value.reprisalAt = now + 2000;
    for (const enemy of area(scene, player, 130, player))
      strike(
        scene,
        player,
        enemy,
        retaliation === 2 ? 1 : 0.6,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][2][6],
      );
    talentVisual(scene, player, 2, player, now);
  }
  const rebirth = rank(player, 2, 9);
  if (amount > 0) amount = Math.max(1, amount);
  if (
    player.classId === 'druid' &&
    rebirth &&
    amount >= player.hitpoints &&
    now >= (value.rebirthAt ?? 0)
  ) {
    value.rebirthAt = now + 60000;
    amount = Math.max(0, player.hitpoints - player.maxHitpoints * (rebirth === 2 ? 0.25 : 0.15));
    talentVisual(scene, player, 2, player, now);
  }
  return amount;
}
/** Extra bleed chance is additive with the weapon's existing roll. */
export function talentAilmentChance(player: Player, kind: DebuffKind) {
  if (kind !== 'bleed' || (player.classId ?? 'warrior') !== 'warrior') return 0;
  const learned = rank(player, 1, 0);
  return learned === 2 ? 0.35 : learned === 1 ? 0.2 : 0;
}
export function talentWeaponHit(
  scene: SceneState,
  player: Player,
  enemy: Enemy,
  now: number,
  companion = false,
  stats?: CharacterStats,
) {
  const value = state(player, scene);
  value.stats = stats ?? characterStats(player);
  const guard = rank(player, 2, 0);
  if (
    !companion &&
    enemy.challengedBy === player.id &&
    (enemy.challengedUntil ?? 0) > now &&
    !value.challengeHits?.has(enemy.id)
  ) {
    value.challengeHits ??= new Set();
    value.challengeHits.add(enemy.id);
    strike(
      scene,
      player,
      enemy,
      rank(player, 2, 5) === 2 ? 1.2 : 0.5,
      now,
      TALENT_NAMES[player.classId ?? 'warrior'][2][5],
    );
  }
  if (guard && now >= value.guardReadyAt && Math.random() < (guard === 2 ? 0.25 : 0.15)) {
    value.guardUntil = now + 3000;
    value.guardReadyAt = now + 4000;
  }
  value.hits++;
  const follow = rank(player, 0, 0);
  if (!companion && follow && value.hits % 3 === 0)
    for (const other of area(scene, enemy, 100, player))
      if (other !== enemy)
        strike(
          scene,
          player,
          other,
          follow === 2 ? 0.7 : 0.4,
          now,
          TALENT_NAMES[player.classId ?? 'warrior'][0][0],
        );
  if ((player.classId ?? 'warrior') === 'druid' && companion) {
    const bond = rank(player, 1, 0);
    if (bond && value.hits % 3 === 0)
      strike(
        scene,
        player,
        enemy,
        bond === 2 ? 0.7 : 0.4,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][1][0],
      );
    const rake = rank(player, 1, 2);
    if (rake && Math.random() < (rake === 2 ? 0.45 : 0.25))
      applyTalentAilment(enemy, player, 'bleed', 1, now);
    const life = rank(player, 1, 8);
    if (life && value.hits % 5 === 0) heal(player, life === 2 ? 0.04 : 0.02);
    const shared = rank(player, 1, 6);
    if (
      shared &&
      enemy.debuffs?.some(
        (entry) => entry.ownerId === player.id && entry.kind === 'roots' && entry.expiresAt > now,
      )
    )
      strike(
        scene,
        player,
        enemy,
        shared === 2 ? 0.6 : 0.3,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][1][6],
      );
    const instinct = rank(player, 1, 9);
    if (instinct && value.hits % 5 === 0)
      for (const other of area(scene, enemy, 160, player))
        if (other !== enemy)
          strike(
            scene,
            player,
            other,
            instinct === 2 ? 1 : 0.6,
            now,
            TALENT_NAMES[player.classId ?? 'warrior'][1][9],
          );
  }
  if (
    player.classId !== 'warrior' &&
    player.classId !== 'druid' &&
    rank(player, 1, 0) &&
    !companion &&
    Math.random() < (rank(player, 1, 0) === 2 ? 0.35 : 0.2)
  )
    applyTalentAilment(
      enemy,
      player,
      player.classId === 'mage' ? 'burn' : player.classId === 'druid' ? 'roots' : 'poison',
      1,
      now,
    );
  if (player.classId === 'druid' && rank(player, 2, 0) && value.hits % 5 === 0)
    heal(player, rank(player, 2, 0) === 2 ? 0.04 : 0.02);
}

export function talentEnemyDeath(scene: SceneState, player: Player, enemy: Enemy, now: number) {
  if (player.classId === 'druid') return;
  const spread = rank(player, 1, 6);
  const wounds = enemy.debuffs?.some(
    (entry) =>
      entry.ownerId === player.id &&
      entry.expiresAt > now &&
      ['bleed', 'poison', 'burn'].includes(entry.kind),
  );
  if (spread && wounds) {
    const kind =
      player.classId === 'warrior' || player.classId === 'druid'
        ? 'bleed'
        : player.classId === 'ranger'
          ? 'poison'
          : 'burn';
    for (const other of area(scene, enemy, 180, player).slice(0, spread === 2 ? 4 : 2))
      applyTalentAilment(other, player, kind, spread, now);
  }
}

export function executeTalent(
  scene: SceneState,
  player: Player,
  slot: number,
  nodeId: string,
  learned: number,
  aim: { x: number; y: number },
  now: number,
  stats: CharacterStats = characterStats(player),
  players: Player[] = [player],
  healingRadius = 700,
) {
  const effectArea = (scene: SceneState, point: { x: number; y: number }, radius: number) =>
    area(scene, point, radius * (1 + stats.bonuses.areaOfEffect / 100));
  const column = Math.floor(slot / 4),
    tier = slot % 4;
  const classId = player.classId ?? 'warrior';
  const ability = TALENT_NAMES[classId][column][[1, 3, 5, 7][tier]];
  state(player, scene).stats = stats;
  const origin = { x: player.x, y: player.y };
  const distance = forestDistance(player, aim);
  const maxRange = (classId === 'warrior' ? 350 : 700) * (1 + stats.bonuses.range / 100);
  if (distance > maxRange) {
    const dx = wrappedDelta(aim.x, player.x, FOREST.width),
      dy = wrappedDelta(aim.y, player.y, FOREST.height);
    aim = {
      x: wrap(player.x + (dx / distance) * maxRange, FOREST.width),
      y: wrap(player.y + (dy / distance) * maxRange, FOREST.height),
    };
  }
  const recipient =
    classId === 'druid' && column === 2 && (tier === 0 || tier === 3)
      ? healingTarget(players, player, origin, healingRadius)
      : undefined;
  talentVisual(scene, player, column, recipient ?? (column === 2 ? origin : aim), now);
  let targets = effectArea(
    scene,
    classId === 'warrior' && tier !== 2 ? origin : aim,
    learned === 2 ? 170 : 125,
  );
  const heading = Math.atan2(
    wrappedDelta(aim.y, player.y, FOREST.height),
    wrappedDelta(aim.x, player.x, FOREST.width),
  );
  if (classId === 'warrior' && column === 0 && (tier === 0 || tier === 2))
    targets = scene.enemies.filter((enemy) => {
      if (enemy.hitpoints <= 0) return false;
      const dx = wrappedDelta(enemy.x, player.x, FOREST.width),
        dy = wrappedDelta(enemy.y, player.y, FOREST.height);
      const forward = dx * Math.cos(heading) + dy * Math.sin(heading),
        sideways = -dx * Math.sin(heading) + dy * Math.cos(heading);
      return tier === 0
        ? forward >= 0 &&
            Math.hypot(dx, dy) <=
              (learned === 2 ? 170 : 125) * (1 + stats.bonuses.areaOfEffect / 100)
        : forward >= 0 &&
            forward <= maxRange &&
            Math.abs(sideways) <= 65 * (1 + stats.bonuses.areaOfEffect / 100);
    });
  const primary = [...scene.enemies]
    .filter(
      (enemy) =>
        enemy.hitpoints > 0 &&
        forestDistance(enemy, aim) < 180 * (1 + stats.bonuses.areaOfEffect / 100),
    )
    .sort((a, b) => forestDistance(a, aim) - forestDistance(b, aim))[0];
  if (column === 2) {
    if (tier === 0) {
      if (classId === 'druid') {
        if (recipient) heal(recipient, learned === 2 ? 0.2 : 0.12);
      } else
        for (const enemy of effectArea(scene, origin, 150)) {
          strike(scene, player, enemy, learned === 2 ? 1.4 : 0.9, now, ability);
          applyTalentAilment(enemy, player, 'roots', 1, now, learned === 2 ? 1000 : 600);
          enemy.attack = undefined;
          control(enemy, now, learned === 2 ? 1000 : 600);
        }
      const fragments = rank(player, 2, 2);
      if (fragments)
        for (const enemy of effectArea(scene, aim, 250).slice(0, fragments === 2 ? 4 : 2))
          strike(
            scene,
            player,
            enemy,
            fragments === 2 ? 0.5 : 0.35,
            now,
            TALENT_NAMES[player.classId ?? 'warrior'][2][2],
          );
    } else if (tier === 1) {
      schedule(scene, player, nodeId, now, 5000, 1000, (at, players) => {
        if (classId === 'druid') {
          const ally = healingTarget(
            players,
            player,
            origin,
            200 * (1 + stats.bonuses.areaOfEffect / 100),
          );
          if (ally) heal(ally, learned === 2 ? 0.04 : 0.025);
        } else
          for (const ally of players.filter(
            (ally) =>
              ally.hitpoints > 0 &&
              forestDistance(ally, origin) <= 200 * (1 + stats.bonuses.areaOfEffect / 100),
          )) {
            shield(ally, scene, player.maxHitpoints * (learned === 2 ? 0.1 : 0.06), at + 1200);
          }
        const hold = rank(player, 2, 4);
        if (hold)
          for (const enemy of effectArea(scene, origin, 200)) {
            applyTalentAilment(enemy, player, 'roots', 1, at, hold === 2 ? 1400 : 800);
            control(enemy, at, hold === 2 ? 1400 : 800);
          }
      });
    } else if (tier === 2) {
      state(player, scene).challengeHits = new Set();
      shield(player, scene, player.maxHitpoints * (learned === 2 ? 0.25 : 0.15), now + 5000);
      for (const enemy of effectArea(scene, origin, learned === 2 ? 250 : 200)) {
        if (classId === 'warrior') {
          enemy.challengedBy = player.id;
          enemy.challengedUntil = now + 3000;
        }
        enemy.attack = undefined;
        applyTalentAilment(enemy, player, 'roots', 1, now, 1000);
      }
    } else {
      const value = state(player, scene);
      value.wallUntil = now + (learned === 2 ? 3000 : 2000);
      value.wallRank = learned;
      value.wallPrevented = false;
      if (recipient) heal(recipient, learned === 2 ? 0.35 : 0.2);
      const shared = rank(player, 2, 8);
      if (shared)
        schedule(scene, player, nodeId, now, value.wallUntil - now, 500, (at, players) => {
          for (const ally of players.filter(
            (ally) =>
              ally !== player &&
              ally.hitpoints > 0 &&
              forestDistance(ally, player) <= 160 * (1 + stats.bonuses.areaOfEffect / 100),
          ))
            shield(ally, scene, ally.maxHitpoints * (shared === 2 ? 0.05 : 0.03), at + 1000);
        });
    }
    const unbroken = rank(player, 2, 9);
    const value = state(player, scene);
    if (unbroken && tier === 0 && value.wallPrevented) {
      value.wallPrevented = false;
      for (const enemy of effectArea(scene, origin, 150))
        strike(
          scene,
          player,
          enemy,
          unbroken === 2 ? 1.12 : 0.45,
          now,
          TALENT_NAMES[player.classId ?? 'warrior'][2][9],
        );
    }
    return;
  }
  if (classId === 'druid' && column === 1) {
    const bear = player.bear;
    if (!bear || bear.hitpoints <= 0) return;
    if (tier === 0 && primary) {
      bear.x = primary.x;
      bear.y = primary.y;
      strike(scene, player, primary, learned === 2 ? 2.1 : 1.5, now, ability);
    } else if (tier === 1) {
      bear.hitpoints = Math.min(
        bear.maxHitpoints,
        bear.hitpoints + bear.maxHitpoints * (learned === 2 ? 0.3 : 0.2),
      );
      for (const enemy of effectArea(scene, bear, 200))
        applyTalentAilment(enemy, player, 'roots', 1, now, 1500);
    } else if (tier === 2)
      for (const enemy of effectArea(scene, bear, 250)) {
        strike(scene, player, enemy, learned === 2 ? 2.5 : 1.8, now, ability);
        applyTalentAilment(enemy, player, 'bleed', learned, now);
      }
    else
      schedule(scene, player, nodeId, now, 4000, 1000, (at) => {
        if (bear.hitpoints <= 0) return;
        for (const enemy of effectArea(scene, bear, 180))
          strike(scene, player, enemy, learned === 2 ? 1 : 0.6, at, ability);
      });
    const hunting = rank(player, 1, 4);
    if (hunting && tier === 1)
      for (const enemy of effectArea(scene, bear, 200))
        applyTalentAilment(enemy, player, 'bleed', hunting, now);
    return;
  }
  const ailment: DebuffKind =
    classId === 'warrior'
      ? 'bleed'
      : classId === 'ranger'
        ? 'poison'
        : classId === 'mage'
          ? 'burn'
          : 'roots';
  if (column === 1 && tier === 2) {
    if (!primary) return;
    const wounds =
      primary.debuffs?.filter(
        (entry) => entry.ownerId === player.id && entry.kind === ailment && entry.expiresAt > now,
      ) ?? [];
    const burst =
      wounds.reduce(
        (sum, entry) =>
          sum + entry.stacks * Math.max(0, Math.floor((entry.expiresAt - now) / 1000)),
        0,
      ) * (learned === 2 ? 2 : 1.5);
    const consumedStacks = wounds.reduce((sum, entry) => sum + entry.stacks, 0);
    primary.debuffs = primary.debuffs?.filter((entry) => !wounds.includes(entry));
    hitEnemy(scene, primary, burst, player, now, undefined, 'physical', false, ability);
    if (learned === 2)
      for (const enemy of effectArea(scene, primary, 150))
        if (enemy !== primary)
          hitEnemy(scene, enemy, burst * 0.5, player, now, undefined, 'physical', false, ability);
    const offering = rank(player, 1, 8);
    let orbConsumed = false;
    if (offering && consumedStacks >= 3)
      schedule(scene, player, nodeId, now, 6000, 500, (_at, players) => {
        if (orbConsumed) return;
        const ally = healingTarget(
          players,
          player,
          primary,
          60 * (1 + stats.bonuses.areaOfEffect / 100),
        );
        if (ally) {
          heal(ally, offering === 2 ? 0.05 : 0.03);
          orbConsumed = true;
        }
      });
    return;
  }
  const hitIds = new Set<number>();
  const hit = (enemy: Enemy, at: number, scale: number) => {
    hitIds.add(enemy.id);
    const copies =
      1 +
      (classId === 'warrior'
        ? stats.bonuses.additionalAttack
        : classId === 'mage'
          ? stats.bonuses.moreProjectiles
          : 0);
    for (let copy = 0; copy < copies && enemy.hitpoints > 0; copy++) {
      strike(scene, player, enemy, scale, at, ability);
      if (classId === 'warrior' && stats.bonuses.additionalAttack > 0)
        talentWeaponHit(scene, player, enemy, at, false, stats);
      const serrated = rank(player, 1, 2);
      if (column === 0 && serrated && Math.random() < (serrated === 2 ? 0.45 : 0.25))
        applyTalentAilment(enemy, player, ailment, 1, at);
      if (column === 1) applyTalentAilment(enemy, player, ailment, learned === 2 ? 3 : 2, at);
      const deep = rank(player, 1, 9);
      if (
        deep &&
        enemy.debuffs?.some(
          (entry) => entry.ownerId === player.id && entry.stacks >= 5 && entry.expiresAt > at,
        ) &&
        Math.random() < (deep === 2 ? 0.35 : 0.2) &&
        at >= (deepCuts.get(enemy)?.get(player) ?? 0)
      ) {
        const timers = deepCuts.get(enemy) ?? new WeakMap<Player, number>();
        timers.set(player, at + 2000);
        deepCuts.set(enemy, timers);
        strike(
          scene,
          player,
          enemy,
          deep === 2 ? 1.3 : 0.8,
          at,
          TALENT_NAMES[player.classId ?? 'warrior'][1][9],
        );
      }
    }
  };
  if (tier === 1 && column === 1 && primary) {
    hit(primary, now, learned === 2 ? 1.5 : 1);
    if (primary.kind !== 'boss') {
      primary.x = wrap(
        player.x + wrappedDelta(primary.x, player.x, FOREST.width) * 0.25,
        FOREST.width,
      );
      primary.y = wrap(
        player.y + wrappedDelta(primary.y, player.y, FOREST.height) * 0.25,
        FOREST.height,
      );
    }
    const trail = rank(player, 1, 4);
    if (trail)
      for (const enemy of effectArea(scene, primary, 150))
        applyTalentAilment(enemy, player, ailment, trail, now);
  } else if ((tier === 1 && column === 0) || (tier === 3 && column === 1)) {
    const count = column === 0 ? 3 : 4;
    schedule(scene, player, nodeId, now, (count - 1) * 500, 500, (at) => {
      for (const enemy of effectArea(scene, column === 0 ? player : aim, learned === 2 ? 170 : 125))
        hit(enemy, at, column === 0 ? (learned === 2 ? 0.65 : 0.45) : learned === 2 ? 0.45 : 0.3);
      talentVisual(scene, player, column, column === 0 ? player : aim, at);
      const advancing = rank(player, 0, 4);
      if (column === 0 && advancing && at === now + (count - 1) * 500)
        for (const enemy of effectArea(scene, aim, 220))
          strike(
            scene,
            player,
            enemy,
            advancing === 2 ? 1.1 : 0.7,
            at,
            TALENT_NAMES[player.classId ?? 'warrior'][0][4],
          );
    });
  } else
    for (const enemy of tier === 3 ? (primary ? [primary] : []) : targets)
      hit(
        enemy,
        now,
        tier === 3 && enemy.hitpoints < (enemy.maxHitpoints ?? enemy.hitpoints) * 0.3
          ? learned === 2
            ? 4
            : 3
          : learned === 2
            ? 2.1
            : 1.5,
      );
  if (column === 0 && (tier === 0 || tier === 2 || tier === 3)) {
    let previous = primary ?? targets[0];
    const extras =
      classId === 'druid'
        ? stats.bonuses.projectilesBounce
        : classId === 'ranger'
          ? stats.bonuses.projectilePierce
          : 0;
    for (let extra = 0; previous && extra < extras; extra++) {
      const next = scene.enemies
        .filter((enemy) => {
          if (enemy.hitpoints <= 0 || hitIds.has(enemy.id)) return false;
          if (classId === 'druid')
            return forestDistance(previous!, enemy) <= 300 * (1 + stats.bonuses.range / 100);
          const dx = wrappedDelta(enemy.x, player.x, FOREST.width);
          const dy = wrappedDelta(enemy.y, player.y, FOREST.height);
          return (
            dx * Math.cos(heading) + dy * Math.sin(heading) >= 0 &&
            Math.abs(-dx * Math.sin(heading) + dy * Math.cos(heading)) <= 32 &&
            forestDistance(player, enemy) <= maxRange
          );
        })
        .sort((a, b) => forestDistance(previous!, a) - forestDistance(previous!, b))[0];
      if (!next) break;
      hit(next, now, learned === 2 ? 2.1 : 1.5);
      previous = next;
    }
  }
  const second = column === 0 ? rank(player, column, 2) : 0;
  if (second && tier === 0 && Math.random() < (second === 2 ? 0.5 : 0.25))
    schedule(scene, player, nodeId, now + 300, 0, 1, (at) => {
      for (const enemy of effectArea(scene, aim, 125)) hit(enemy, at, learned === 2 ? 1.05 : 0.75);
    });
  const value = state(player, scene);
  if (column === 0 && tier === 2 && rank(player, 0, 6))
    value.fissure = { ...aim, until: now + 4000 };
  else if (tier === 0 && value.fissure && value.fissure.until > now) {
    for (const enemy of effectArea(scene, value.fissure, 170))
      strike(
        scene,
        player,
        enemy,
        rank(player, 0, 6) === 2 ? 1.5 : 0.9,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][0][6],
      );
    value.fissure = undefined;
  }
  const momentum = rank(player, 0, 8);
  if (column === 0 && tier === 3 && primary && primary.hitpoints <= 0 && momentum) {
    const id = `talent:${classId}:${slot}`;
    player.talentCooldowns![id] = Math.max(
      now,
      player.talentCooldowns![id] - (momentum === 2 ? 12000 : 6000),
    );
    value.empoweredUntil = now + 6000;
  }
  if (tier === 0 && value.empoweredUntil && value.empoweredUntil > now) {
    value.empoweredUntil = undefined;
    for (const enemy of targets)
      strike(
        scene,
        player,
        enemy,
        momentum === 2 ? 0.75 : 0.5,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][0][8],
      );
  }
  value.sequence = value.sequence.filter((entry) => now - entry.at <= 6000 && entry.slot !== slot);
  value.sequence.push({ slot, at: now });
  const rhythm = rank(player, 0, 9);
  if (rhythm && value.sequence.length >= 3 && now >= value.rhythmAt) {
    value.rhythmAt = now + 8000;
    value.sequence = [];
    for (const enemy of effectArea(scene, player, 200))
      strike(
        scene,
        player,
        enemy,
        rhythm === 2 ? 1.6 : 1,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][0][9],
      );
  }
}
