import type { MeterKey } from './meter-key.ts';
import { refreshCombatTotals } from './refresh-combat-totals.ts';
import { history } from './history.ts';
import type { Player } from '@emberfall/common';
import { COMBAT_TUNING } from './tuning.ts';

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
