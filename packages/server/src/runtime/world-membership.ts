import { randomUUID } from 'node:crypto';
import { createPlayers } from '../ecs/simulation.ts';
import { Parties } from '../parties.ts';
import { VillageLife } from '../npcs.ts';
import { addChat } from '../chat.ts';
import { serverLog } from '../log.ts';
import type { CharacterStore } from '../characters.ts';
import type { NpcDialogue } from '../npc-models.ts';
import type { Player } from '@emberfall/common';
import type { World, Session } from './models.ts';

export function createWorldMembership(
  characters: Pick<CharacterStore, 'worlds' | 'saveWorld' | 'save' | 'deleteWorld'>,
  dialogue: NpcDialogue,
) {
  // shortcut: worlds share one process; add room sharding when measured load requires it.
  const restoredWorlds = characters.worlds();
  const permanentWorld: World = {
    id: randomUUID(),
    hostId: '',
    salt: '',
    players: createPlayers(),
    ...restoredWorlds.find((world) => {
      return world.permanent;
    }),
    name: 'Playtest Default',
  };
  characters.saveWorld(permanentWorld, true);
  const worlds = new Map<string, World>(
    restoredWorlds.map((world) => {
      return [
        world.id,
        {
          ...world,
          hostId: '',
          players: createPlayers(),
        },
      ];
    }),
  );
  worlds.set(permanentWorld.id, permanentWorld);
  serverLog.info('Runtime ready', { worlds: worlds.size, restoredWorlds: restoredWorlds.length });
  const villageLives = new Map<World, VillageLife>();
  const villageLife = (world: World, now: number) => {
    let life = villageLives.get(world);

    if (!life) {
      life = new VillageLife(world, dialogue, now);
      villageLives.set(world, life);
    }

    return life;
  };

  const partyWorlds = new WeakMap<World, Parties>();
  const parties = (world: World) => {
    let value = partyWorlds.get(world);

    if (!value) {
      value = new Parties(world);
      partyWorlds.set(world, value);
    }

    return value;
  };

  const resourceOwner = (world: World, player?: Player) => {
    return player?.scene ? parties(world).run(player) : world;
  };

  function leave(session: Session, shuttingDown = false) {
    const world = worlds.get(session.worldId ?? '');

    if (world) {
      const player = world.players.get(session.id);

      if (player && session.characterId) {
        characters.save(session.characterId, player.name, player);
      }

      if (player) {
        addChat(world, `${player.name} disconnected.`, undefined, player.id);

        if (player.scene) {
          addChat(
            world,
            `${player.name} left the scene. Everyone became weaker.`,
            undefined,
            player.id,
          );
        }
      }

      if (player) {
        parties(world).leave(player, true);
      }

      world.players.delete(session.id);

      if (player) {
        serverLog.info('Player left world', { sessionId: session.id, worldId: world.id });
      }

      if (!world.players.size) {
        if (world !== permanentWorld && !shuttingDown) {
          characters.deleteWorld(world.id);
          worlds.delete(world.id);
          serverLog.info('Empty world removed', { worldId: world.id });
        }

        world.hostId = '';
        world.chat = [];
        villageLives.get(world)?.close();
        villageLives.delete(world);
        world.npcs = undefined;
      } else if (world.hostId === session.id) {
        world.hostId = world.players.keys().next().value!;
      }
    }

    clearTimeout(session.reconnectTimer);
    session.worldId = undefined;
    session.inputs = [];
    session.lastSeq = 0;
    session.timed = undefined;
    session.x = 0;
    session.y = 0;
  }

  function closeVillageLives() {
    for (const life of villageLives.values()) {
      life.close();
    }

    villageLives.clear();
  }

  return { worlds, permanentWorld, parties, villageLife, resourceOwner, leave, closeVillageLives };
}

export type WorldMembership = ReturnType<typeof createWorldMembership>;
