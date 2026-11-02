import { history } from './history.ts';
import type { Player } from '@emberfall/core/contracts';
import { COMBAT_TUNING } from './tuning.ts';

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
