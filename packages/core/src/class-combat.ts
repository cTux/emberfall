import { game, type createGame } from './game.ts';
import { talentAilmentChance, talentWeaponHit, talentEnemyDeath } from './talent-effects.ts';
type Game = ReturnType<typeof createGame>;
import { appendSceneEntities, wrappedDelta, wrap } from '@emberfall/common';
import { LOOT_ITEM_IDS } from './definitions/equipment.ts';
import { FOREST, forestDistance } from './scene.ts';
import { characterStats } from './equipment.ts';
import { type CharacterStats } from './content/rules.ts';
import { TRANSIENT_EFFECTS } from './definitions/effects/transient.ts';
import { COLLISION } from './definitions/collision.ts';
import { AILMENT_DEFINITIONS } from './definitions/effects/ailments.ts';
import { PICKUP_DEFINITIONS, PICKUP_RULES } from './definitions/entities/pickups.ts';
import { ENEMY_RULES } from './definitions/entities/enemies.ts';
import { ATTACK_DEFINITIONS } from './definitions/abilities/attacks.ts';
import { enemyHitbox, overlapsBody } from './hitboxes.ts';
import type { DebuffKind, Enemy, PlayerShot, SceneState, Player } from '@emberfall/common';
import type { DamageType } from './definitions/equipment.ts';
import { EnemyType } from '@emberfall/common/enums';
import { isChanced } from './utils/isChanced.ts';
import { shouldDropItem } from './utils/shouldDropItem.ts';
import { itemDropCount } from './utils/itemDropCount.ts';
import { isMultiChanced } from './utils/isMultiChanced.ts';
import type { AbilityDefinition } from './content/contracts.ts';

const rewardPlayers = new WeakMap<SceneState, Player[]>();
export function setRewardPlayers(scene: SceneState, players: Player[]) {
  rewardPlayers.set(scene, players);
}
export function effectiveAbility(
  player: Player,
  ability: Readonly<AbilityDefinition>,
  context: Game = game,
) {
  const { bonuses } = context.rules.characterStats(player);
  return {
    ...ability,
    range: ability.range * (1 + bonuses.range / 100),
    manualRange: ability.manualRange * (1 + bonuses.range / 100),
    count: ability.count + (ability.kind === 'fireball' ? bonuses.moreProjectiles : 0),
    bounces: ability.bounces + (ability.kind === 'roots' ? bonuses.projectilesBounce : 0),
    pierce: (ability.pierce ?? 3) + (ability.kind === 'arrow' ? bonuses.projectilePierce : 0),
    splashRadius: ability.splashRadius * (1 + bonuses.areaOfEffect / 100),
    bounceRadius: ability.bounceRadius * (1 + bonuses.range / 100),
  };
}

const damageHistory = new WeakMap<Player, { at: number; amount: number; ability: string }[]>();
export function damagePerSecond(player: Player, now: number) {
  if (player.damageMeter && player.damageMeter.classId !== (player.classId ?? 'warrior')) {
    player.damageMeter = undefined;
    damageHistory.delete(player);
  }
  const recent = (damageHistory.get(player) ?? []).filter((hit) => now - hit.at < 5000);
  damageHistory.set(player, recent);
  for (const value of Object.values(player.damageMeter?.abilities ?? {})) value.dps = 0;
  for (const hit of recent) player.damageMeter!.abilities[hit.ability].dps += hit.amount / 5;
  return recent.reduce((sum, hit) => sum + hit.amount, 0) / 5;
}

export function hitEnemy(
  scene: SceneState,
  enemy: Enemy,
  amount: number,
  owner: Player | undefined,
  now: number,
  ailment?: DebuffKind,
  damageType: DamageType = 'physical',
  critical = false,
  ability = 'Attack',
) {
  if (enemy.hitpoints <= 0 || amount <= 0) return;
  amount = Math.max(1, amount);
  const dealt = Math.min(enemy.hitpoints, amount);
  enemy.hitpoints = Math.max(0, enemy.hitpoints - amount);
  if (owner) {
    if (owner.damageMeter && owner.damageMeter.classId !== (owner.classId ?? 'warrior'))
      damagePerSecond(owner, now);
    const meter = (owner.damageMeter ??= {
      classId: owner.classId ?? 'warrior',
      total: 0,
      abilities: {},
    });
    meter.total += dealt;
    const entry = (meter.abilities[ability] ??= { damage: 0, dps: 0 });
    entry.damage += dealt;
    const history = damageHistory.get(owner) ?? [];
    history.push({ at: now, amount: dealt, ability });
    damageHistory.set(owner, history);
  }
  appendSceneEntities(scene, 'damage', {
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
    ailment !== 'roots' &&
    owner &&
    isChanced((AILMENT_DEFINITIONS[ailment].chance + talentAilmentChance(owner, ailment)) * 100)
  ) {
    enemy.debuffs ??= [];
    let debuff = enemy.debuffs.find(
      (d) => d.kind === ailment && d.ownerId === owner.id && d.expiresAt >= now,
    );
    if (!debuff) {
      debuff = {
        kind: ailment,
        stacks: 0,
        expiresAt: now + AILMENT_DEFINITIONS[ailment].durationMs,
        nextTick: now + AILMENT_DEFINITIONS[ailment].tickMs,
        ownerId: owner.id,
      };
      enemy.debuffs = enemy.debuffs.filter((d) => d.kind !== ailment || d.ownerId !== owner.id);
      enemy.debuffs.push(debuff);
    }
    debuff.stacks++;
    debuff.expiresAt = now + AILMENT_DEFINITIONS[ailment].durationMs;
    debuff.ownerId = owner.id;
  }
  if (enemy.hitpoints > 0) return;
  if (owner) talentEnemyDeath(scene, owner, enemy, now);
  if (scene.training) return;
  if (owner) owner.experience++;
  const members = new Map(
    (rewardPlayers.get(scene) ?? (owner ? [owner] : []))
      .filter(
        (player) => player.id === owner?.id || (owner?.partyId && player.partyId === owner.partyId),
      )
      .map((player) => [player.id, player]),
  );
  const bonuses = [...members.values()].map((player) => characterStats(player).bonuses);
  const experienceCopies =
    1 + isMultiChanced(bonuses.reduce((sum, stats) => sum + stats.expIncrease, 0));
  scene.drops ??= [];
  for (let copy = 0; copy < experienceCopies; copy++)
    appendSceneEntities(scene, 'drops', {
      id: ++scene.sequence,
      kind: 'experience',
      amount: ENEMY_RULES.experiencePerMember ** Math.max(0, (scene.playerCount ?? 1) - 1),
      x: enemy.x,
      y: enemy.y,
      at: now,
    });
  if (isChanced(PICKUP_DEFINITIONS.gold.chance * 100)) {
    const goldCopies =
      1 + isMultiChanced(bonuses.reduce((sum, stats) => sum + stats.goldIncrease, 0));
    for (let copy = 0; copy < goldCopies; copy++)
      appendSceneEntities(scene, 'drops', {
        id: ++scene.sequence,
        kind: 'gold',
        x: wrap(enemy.x + 10, FOREST.width),
        y: enemy.y,
        at: now,
      });
  }
  const type = enemy.kind ?? EnemyType.Normal;
  if (shouldDropItem(type)) {
    const count = itemDropCount(type);
    for (let i = 0; i < count; i++) {
      const item = game.rules.rollItem(
        LOOT_ITEM_IDS[Math.floor(Math.random() * LOOT_ITEM_IDS.length)],
      );
      appendSceneEntities(scene, 'drops', {
        id: ++scene.sequence,
        kind: 'item',
        itemId: item.itemId,
        rarity: item.rarity,
        stats: item.stats,
        x: wrap(enemy.x - 10, FOREST.width),
        y: enemy.y,
        at: now,
      });
    }
  }
  if (scene.drops.length > PICKUP_RULES.capacity)
    scene.drops = scene.drops.slice(-PICKUP_RULES.capacity);
}

export function tickDebuffs(scene: SceneState, players: Player[], now: number) {
  for (const enemy of scene.enemies) {
    for (const debuff of enemy.debuffs ?? []) {
      if (AILMENT_DEFINITIONS[debuff.kind].damagePerStack === 0) continue;
      while (debuff.nextTick <= Math.min(now, debuff.expiresAt) && enemy.hitpoints > 0) {
        hitEnemy(
          scene,
          enemy,
          debuff.stacks * AILMENT_DEFINITIONS[debuff.kind].damagePerStack,
          players.find((p) => p.id === debuff.ownerId),
          now,
          undefined,
          debuff.kind === 'burn' ? 'fire' : debuff.kind === 'poison' ? 'poison' : 'physical',
          false,
          debuff.kind[0].toUpperCase() + debuff.kind.slice(1),
        );
        debuff.nextTick += AILMENT_DEFINITIONS[debuff.kind].tickMs;
      }
    }
    enemy.debuffs = enemy.debuffs?.filter((d) => d.expiresAt > now);
  }
}

export function defaultSpellRange(
  player: Pick<Player, 'classId' | 'autoTarget' | 'equipment' | 'equipmentItems'>,
  context: Game = game,
) {
  const stats = context.rules.characterStats(player);
  if (!stats.hasWeapon) return 0;
  const range = player.autoTarget === false ? stats.manualRange : stats.range;
  const attack = context.registries.abilities.require(
    context.registries.classes.require(player.classId ?? 'warrior').attack,
  );
  return range * (attack.kind === 'slash' ? 1 + stats.bonuses.areaOfEffect / 100 : 1);
}

/** Called only by authoritative hit resolution, never by cast prediction. */
export function hitWithWeapon(
  scene: SceneState,
  enemy: Enemy,
  owner: Player,
  now: number,
  ailment?: DebuffKind,
  powerScale = 1,
  stats: CharacterStats = characterStats(owner),
  companion = false,
  context: Game = game,
) {
  if (enemy.hitpoints <= 0) return;
  if (!stats.hasWeapon) return;
  const attacks =
    !companion && context.registries.classes.require(owner.classId ?? 'warrior').art === 'warrior'
      ? 1 + stats.bonuses.additionalAttack
      : 1;
  for (let attack = 0; attack < attacks && enemy.hitpoints > 0; attack++) {
    const critical = isChanced(stats.criticalChance * 100);
    hitEnemy(
      scene,
      enemy,
      stats.power * powerScale * (critical ? stats.criticalMultiplier : 1),
      owner,
      now,
      ailment,
      stats.damageType,
      critical,
      companion
        ? 'Bear'
        : (context.registries.classes.get(owner.classId ?? 'warrior')?.details?.spell ?? 'Attack'),
    );
    talentWeaponHit(scene, owner, enemy, now, companion, stats);
  }
}

function applyRoots(target: Enemy, ownerId: string, now: number) {
  if (target.kind === 'boss') return;
  target.debuffs = (target.debuffs ?? []).filter((d) => d.kind !== 'roots');
  target.debuffs.push({
    kind: 'roots',
    stacks: 1,
    expiresAt: now + AILMENT_DEFINITIONS.roots.durationMs,
    nextTick: now + 1000,
    ownerId,
  });
}

export function projectileAngle(
  aimAngle: number,
  index: number,
  count: number,
  spread = ATTACK_DEFINITIONS.arrow.spreadRadians,
) {
  return aimAngle + (index - (count - 1) / 2) * spread;
}

/** Shared wrapped target selection for cast scheduling, launch and prediction. */
export function nearestSpellTarget(
  player: { x: number; y: number },
  enemies: Enemy[],
  range: number,
) {
  let target: Enemy | undefined;
  let nearest = range;
  for (const enemy of enemies) {
    if (enemy.hitpoints <= 0) continue;
    const distance = forestDistance(enemy, player);
    if (distance <= range && (!target || distance < nearest)) {
      target = enemy;
      nearest = distance;
    }
  }
  return target;
}

export function fireClassAttack(
  scene: SceneState,
  player: Player,
  now = 0,
  context: Game = game,
  abilityId?: string,
) {
  const stats = context.rules.characterStats(player);
  if (!stats.hasWeapon) return;
  const selected = abilityId
    ? effectiveAbility(player, context.registries.abilities.require(abilityId), context)
    : undefined;
  const range = selected
    ? player.autoTarget === false
      ? selected.manualRange
      : selected.range
    : player.autoTarget === false
      ? stats.manualRange
      : stats.range;
  const manual = player.autoTarget === false;
  const aim = { x: player.aimX ?? player.x, y: player.aimY ?? player.y };
  const target = manual ? undefined : nearestSpellTarget(player, scene.enemies, range);
  scene.playerShots ??= [];
  const shotTargets: (Enemy | undefined)[] = manual ? [undefined] : target ? [target] : [];
  for (const target of shotTargets) {
    const destination = target ?? aim;
    const aimAngle = Math.atan2(
      wrappedDelta(destination.y, player.y, FOREST.height),
      wrappedDelta(destination.x, player.x, FOREST.width),
    );
    const attack = effectiveAbility(
      player,
      context.registries.abilities.require(
        abilityId ?? context.registries.classes.require(player.classId ?? 'ranger').attack,
      ),
      context,
    );
    const ailment = context.registries.classes.require(player.classId ?? 'ranger').ailment;
    const defaultAilment =
      attack.kind === 'arrow' ? 'poison' : attack.kind === 'fireball' ? 'burn' : 'roots';
    const count = attack.kind === 'slash' ? 0 : attack.count;
    for (let index = 0; index < count; index++) {
      appendSceneEntities(scene, 'playerShots', {
        id: ++scene.sequence,
        ownerId: player.id,
        castAt: player.attackAt ?? now,
        castId: player.attackId,
        kind: attack.kind as PlayerShot['kind'],
        ...(attack.id === attack.kind ? {} : { abilityId: attack.id }),
        ...(ailment === defaultAilment ? {} : { ailment }),
        x: player.x,
        y: player.y,
        angle: projectileAngle(aimAngle, index, count, attack.spreadRadians),
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
  context: Game = game,
) {
  let travelLimit = shot.remaining;
  if (shot.kind === 'roots' && shot.hitIds.length > 0) {
    const target = enemies.find((enemy) => enemy.id === shot.targetId && enemy.hitpoints > 0);
    if (!target) {
      shot.remaining = 0;
      return false;
    }
    const destination = enemyHitbox(target, context);
    shot.angle = Math.atan2(
      wrappedDelta(destination.y, shot.y, FOREST.height),
      wrappedDelta(destination.x, shot.x, FOREST.width),
    );
    shot.remaining = forestDistance(shot, destination) + 64;
    // Hold at the target while waiting for the next authoritative bounce.
    travelLimit = detectHits ? shot.remaining : forestDistance(shot, destination);
  }
  const distance = Math.min(
    travelLimit,
    Math.max(0, dt) * context.registries.abilities.require(shot.abilityId ?? shot.kind).speed,
  );
  const steps = Math.max(1, Math.ceil(distance / 6));
  for (let i = 0; i < steps; i++) {
    if (shot.remaining <= 0) break;
    shot.x = wrap(shot.x + (Math.cos(shot.angle) * distance) / steps, FOREST.width);
    shot.y = wrap(shot.y + (Math.sin(shot.angle) * distance) / steps, FOREST.height);
    shot.remaining -= distance / steps;
    onStep?.();
    if (detectHits && shot.kind !== 'arrow') {
      const hit = enemies.find(
        (enemy) =>
          enemy.hitpoints > 0 &&
          !shot.hitIds.includes(enemy.id) &&
          (shot.kind !== 'roots' || shot.hitIds.length === 0 || enemy.id === shot.targetId) &&
          overlapsBody(shot, COLLISION.playerProjectileRadius, enemyHitbox(enemy, context)),
      );
      if (hit) {
        shot.hitIds.push(hit.id);
        return true;
      }
    }
  }
  return false;
}

export function tickPlayerShots(
  scene: SceneState,
  players: Player[],
  now: number,
  dt: number,
  context: Game = game,
) {
  scene.explosions = (scene.explosions ?? []).filter(
    (e) => now - e.at < (e.durationMs ?? TRANSIENT_EFFECTS.explosion.lifetimeMs),
  );
  scene.playerShots = (scene.playerShots ?? []).filter((shot) => {
    const owner = players.find(
      (p) =>
        p.id === shot.ownerId &&
        (scene.training ? !p.scene : p.scene === 'forest') &&
        p.hitpoints > 0,
    );
    if (!owner) return false;
    const ability = effectiveAbility(
      owner,
      context.registries.abilities.require(shot.abilityId ?? shot.kind),
      context,
    );
    const stats = context.rules.characterStats(owner);
    const impacted = advancePlayerShot(
      shot,
      scene.enemies,
      dt,
      () => {
        if (shot.kind === 'arrow') {
          for (const enemy of scene.enemies) {
            if (shot.hitIds.length >= 1 + ability.pierce) {
              shot.remaining = 0;
              break;
            }
            if (
              enemy.hitpoints <= 0 ||
              shot.hitIds.includes(enemy.id) ||
              !overlapsBody(shot, COLLISION.playerProjectileRadius, enemyHitbox(enemy, context))
            )
              continue;
            shot.hitIds.push(enemy.id);
            hitWithWeapon(
              scene,
              enemy,
              owner,
              now,
              shot.ailment ?? 'poison',
              ability.powerScale ?? 1,
              stats,
              false,
              context,
            );
            if (shot.hitIds.length >= 1 + ability.pierce) shot.remaining = 0;
          }
        }
      },
      true,
      context,
    );
    if (impacted) {
      if (shot.kind === 'roots') {
        const target = scene.enemies.find((enemy) => enemy.id === shot.hitIds.at(-1));
        if (target) {
          hitWithWeapon(
            scene,
            target,
            owner,
            now,
            undefined,
            ability.powerScale ?? 1,
            stats,
            false,
            context,
          );
          if (target.hitpoints > 0) applyRoots(target, owner.id, now);
          if (shot.hitIds.length <= ability.bounces) {
            const next = scene.enemies
              .filter(
                (enemy) =>
                  enemy.hitpoints > 0 &&
                  !shot.hitIds.includes(enemy.id) &&
                  forestDistance(target, enemy) <= ability.bounceRadius,
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
      appendSceneEntities(scene, 'explosions', {
        ownerId: shot.ownerId,
        id: ++scene.sequence,
        x: shot.x,
        y: shot.y,
        at: now,
        radius: ability.splashRadius,
      });
      for (const enemy of scene.enemies)
        if (enemy.id === shot.hitIds[0])
          hitWithWeapon(
            scene,
            enemy,
            owner,
            now,
            shot.ailment ?? 'burn',
            ability.powerScale ?? 1,
            stats,
            false,
            context,
          );
        else if (overlapsBody(shot, ability.splashRadius, enemyHitbox(enemy, context)))
          hitWithWeapon(
            scene,
            enemy,
            owner,
            now,
            shot.ailment ?? 'burn',
            ability.damage > 0
              ? (ability.splashDamage / ability.damage) * (ability.powerScale ?? 1)
              : 0,
            stats,
            false,
            context,
          );
      return false;
    }
    return shot.remaining > 0.001;
  });
}
