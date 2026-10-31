import { restoreResources, syncEquipmentVitals, tickGathering, TICK_MS } from '@emberfall/core';
import { stepMovement } from '../systems/movement.ts';
import { tickScene } from '../scenes.ts';
import { refreshMerchant } from '../merchant.ts';
import { serverLog } from '../log.ts';
import type { CharacterStore } from '../characters.ts';
import type { Sessions, Send, BroadcastState } from './models.ts';
import type { WorldMembership } from './world-membership.ts';

export function startSimulation({
  sessions,
  worlds,
  parties,
  resourceOwner,
  villageLife,
  characters,
  send,
  broadcastState,
}: Pick<WorldMembership, 'worlds' | 'parties' | 'resourceOwner' | 'villageLife'> & {
  sessions: Sessions;
  characters: Pick<CharacterStore, 'saveMerchant'>;
  send: Send;
  broadcastState: BroadcastState;
}) {
  let simulationAt = Date.now();
  const tick = setInterval(() => {
    const wallTime = Date.now();

    if (wallTime - simulationAt > 250) {
      simulationAt = wallTime - 250;
    }

    while (wallTime - simulationAt >= TICK_MS) {
      simulationAt += TICK_MS;
      const now = simulationAt;

      for (const session of sessions.values()) {
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);

        if (!player) {
          continue;
        }

        stepMovement(
          session,
          player,
          world ? parties(world).run(player).scene?.id : undefined,
          now,
          wallTime,
        );
      }

      for (const world of worlds.values()) {
        try {
          refreshMerchant(world, characters, wallTime);
        } catch (cause) {
          serverLog.error(`Unable to refresh merchant stock for ${world.id}`, cause);
        }

        restoreResources(world.resources, wallTime);

        for (const player of world.players.values()) {
          syncEquipmentVitals(player);
        }

        tickScene(world, now, TICK_MS / 1000);
        parties(world).tick(now, TICK_MS / 1000);

        for (const player of world.players.values()) {
          try {
            tickGathering(
              player,
              (resourceOwner(world, player).resources ??= {}),
              player.scene === 'forest' ? (parties(world).run(player).scene?.id ?? '') : 'lobby',
              wallTime,
            );
          } catch (cause) {
            for (const [ws, session] of sessions) {
              if (session.id === player.id) {
                send(ws, {
                  type: 'error',
                  message: cause instanceof Error ? cause.message : 'Unable to gather.',
                });
              }
            }
          }
        }

        if (world.players.size) {
          villageLife(world, now).tick(now, TICK_MS / 1000);
        }

        broadcastState(world, now);
      }
    }
  }, 10);

  return () => {
    return clearInterval(tick);
  };
}
