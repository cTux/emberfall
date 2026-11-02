import { damageHistory } from './damage-history.ts';
import type { Player } from '@emberfall/common';
import { COMBAT_TUNING } from './tuning.ts';

export function damagePerSecond(player: Player, now: number) {
  if (player.damageMeter && player.damageMeter.classId !== (player.classId ?? 'warrior')) {
    player.damageMeter = undefined;
    damageHistory.delete(player);
  }

  const recent = (damageHistory.get(player) ?? []).filter((hit) => {
    return now - hit.at < COMBAT_TUNING.damageWindowMs;
  });
  damageHistory.set(player, recent);

  for (const value of Object.values(player.damageMeter?.abilities ?? {})) {
    value.dps = 0;
  }

  for (const hit of recent) {
    player.damageMeter!.abilities[hit.ability].dps +=
      hit.amount / COMBAT_TUNING.damageWindowSeconds;
  }

  return (
    recent.reduce((sum, hit) => {
      return sum + hit.amount;
    }, 0) / COMBAT_TUNING.damageWindowSeconds
  );
}
