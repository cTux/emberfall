import { game } from '../game.ts';
import { appendSceneEntities, wrap } from '@emberfall/common';
import type { DebuffKind, Enemy, SceneState, Player, DamageType } from '@emberfall/common';
import { LOOT_ITEM_IDS } from '../definitions/equipment.ts';
import { FOREST } from '../scene.ts';
import { characterStats, dotTickIntervalMs } from '../equipment.ts';
import type { CharacterStats } from '../content/rules.ts';
import { AILMENT_DEFINITIONS } from '../definitions/effects/ailments.ts';
import { PICKUP_DEFINITIONS, PICKUP_RULES } from '../definitions/entities/pickups.ts';
import { ENEMY_RULES } from '../definitions/entities/enemies.ts';
import { EnemyType } from '@emberfall/common/enums';
import { isChanced } from '../utils/isChanced.ts';
import { shouldDropItem } from '../utils/shouldDropItem.ts';
import { itemDropCount } from '../utils/itemDropCount.ts';
import { isMultiChanced } from '../utils/isMultiChanced.ts';
import { talentAilmentChance, talentEnemyDeath } from '../talent-ailments.ts';

const rewardPlayers = new WeakMap<SceneState, Player[]>();
export function setRewardPlayers(scene: SceneState, players: Player[]) {
  rewardPlayers.set(scene, players);
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
  stats?: CharacterStats,
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
      const tickIntervalMs = dotTickIntervalMs(owner, AILMENT_DEFINITIONS[ailment].tickMs, stats);
      debuff = {
        kind: ailment,
        stacks: 0,
        expiresAt: now + AILMENT_DEFINITIONS[ailment].durationMs,
        nextTick: now + tickIntervalMs,
        tickIntervalMs,
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
  if (owner) talentEnemyDeath(scene, owner, enemy, now, stats);
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
