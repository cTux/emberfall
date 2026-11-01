import type { Player } from '@emberfall/common';
import { COMBAT_TUNING } from './tuning.ts';

type MeterKey = 'healingMeter' | 'receivedMeter';
type Meter = NonNullable<Player[MeterKey]>;
const history = new WeakMap<Meter, { at: number; amount: number }[]>();

export function refreshCombatTotals(player: Player, now: number) {
  for (const key of ['healingMeter', 'receivedMeter'] as const) {
    const meter = player[key];

    if (!meter) {
      continue;
    }

    if (meter.classId !== (player.classId ?? 'warrior')) {
      player[key] = undefined;
      continue;
    }

    const recent = (history.get(meter) ?? []).filter((hit) => {
      return now - hit.at < COMBAT_TUNING.damageWindowMs;
    });
    history.set(meter, recent);
    meter.perSecond = recent.reduce((sum, hit) => {
      return sum + hit.amount / COMBAT_TUNING.damageWindowSeconds;
    }, 0);
  }
}

export function recordCombatTotal(player: Player, key: MeterKey, amount: number, now: number) {
  refreshCombatTotals(player, now);

  if (amount <= 0) {
    return;
  }

  const meter = (player[key] ??= {
    classId: player.classId ?? 'warrior',
    total: 0,
    perSecond: 0,
  });
  meter.total += amount;
  meter.perSecond += amount / COMBAT_TUNING.damageWindowSeconds;
  const recent = history.get(meter) ?? [];
  recent.push({ at: now, amount });
  history.set(meter, recent);
}

export function applyHealing(
  target: Pick<Player, 'hitpoints' | 'maxHitpoints'>,
  amount: number,
  owner: Player,
  now: number,
) {
  const before = target.hitpoints;
  target.hitpoints = Math.min(target.maxHitpoints, target.hitpoints + amount);
  recordCombatTotal(owner, 'healingMeter', target.hitpoints - before, now);
}
