import { traderInRange, wrap, wrappedDelta } from '@emberfall/core';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import type { Player } from '@emberfall/common';
import { simulationFor } from './ecs/simulation.ts';
import { villagePlayers, type NpcWorld } from './npc-world.ts';

const SPEED = 38;
interface Routine {
  stop: number;
  pauseUntil: number;
  returnAt: number;
  station: number;
  work?: { remaining: number; elapsed: number };
}

/** Per-world walking, work and trade interruptions, independent of dialogue requests. */
export class NpcRoutines {
  private walks = new Map<string, Routine>();
  private interactions = new Map<string, string>();
  private world: NpcWorld;
  private random: () => number;

  constructor(world: NpcWorld, now: number, random: () => number) {
    this.world = world;
    this.random = random;
    world.npcs = VILLAGE_DEFINITION.villagers.map((definition) => {
      this.walks.set(definition.id, {
        stop: this.chooseStop(),
        pauseUntil: now + 5000 + this.random() * 4000,
        returnAt: now + 25_000 + this.random() * 20_000,
        station: 0,
      });

      return {
        id: definition.id,
        name: definition.name,
        buildingId: definition.buildingId,
        x: definition.x,
        y: definition.y,
        angle: Math.PI / 2,
        moving: false,
        silenced: false,
      };
    });
    world.npcs = simulationFor(world.players)?.setVillagers(world.npcs) ?? world.npcs;
  }

  private chooseStop(previous = -1) {
    const stops = VILLAGE_DEFINITION.npcStops
      .map((_, index) => {
        return index;
      })
      .filter((index) => {
        return index !== previous;
      });
    const claimed = new Set(
      [...this.walks.values()].map((walk) => {
        return walk.stop;
      }),
    );
    const free = stops.filter((index) => {
      return !claimed.has(index);
    });
    const candidates = free.length ? free : stops;

    return candidates[Math.floor(this.random() * candidates.length)];
  }

  close() {
    simulationFor(this.world.players)?.setVillagers([]);
    this.interactions.clear();
  }

  interact(player: Player, npcId: string | null) {
    this.interactions.delete(player.id);
    if (
      !npcId ||
      !villagePlayers(this.world).includes(player) ||
      !this.world.npcs?.some((npc) => {
        return npc.id === npcId;
      }) ||
      !traderInRange(player, npcId, this.world.npcs)
    ) {
      return;
    }

    this.interactions.set(player.id, npcId);
    const npc = this.world.npcs.find((npc) => {
      return npc.id === npcId;
    })!;
    npc.moving = false;
    npc.workstationId = npc.workStartedAt = undefined;
    npc.angle = Math.atan2(
      wrappedDelta(player.y, npc.y, VILLAGE_DEFINITION.geometry.height),
      wrappedDelta(player.x, npc.x, VILLAGE_DEFINITION.geometry.width),
    );
  }

  tick(now: number, dt: number, players: readonly Player[], blocked: ReadonlySet<string>) {
    const npcs = this.world.npcs ?? [];
    for (const [playerId, npcId] of this.interactions) {
      const player = players.find((p) => {
        return p.id === playerId;
      });
      if (!player || !traderInRange(player, npcId, npcs)) {
        this.interactions.delete(playerId);
      }
    }

    const interacting = new Set(this.interactions.values());
    for (const npc of npcs) {
      if ((npc.chatUntil ?? 0) < now) {
        npc.chat = undefined;
      }

      const walk = this.walks.get(npc.id)!;
      npc.workstationId = npc.workStartedAt = undefined;
      if (
        !players.length ||
        blocked.has(npc.id) ||
        interacting.has(npc.id) ||
        (npc.chatUntil ?? 0) > now
      ) {
        npc.moving = false;
        continue;
      }

      const returning = now >= walk.returnAt;
      const stations = VILLAGE_DEFINITION.workstations.filter((s) => {
        return s.npcId === npc.id;
      });
      const station = stations[walk.station % stations.length];
      if (walk.work && station) {
        npc.moving = false;
        npc.angle = Math.atan2(
          wrappedDelta(station.y - 18, npc.y - 24, VILLAGE_DEFINITION.geometry.height),
          wrappedDelta(station.x, npc.x, VILLAGE_DEFINITION.geometry.width),
        );
        npc.workstationId = station.id;
        npc.workStartedAt = now - walk.work.elapsed;
        const active = Math.max(0, dt * 1000);
        walk.work.remaining -= active;
        walk.work.elapsed += active;
        if (walk.work.remaining <= 0) {
          walk.work = undefined;
          walk.station++;
          walk.returnAt = now + 25_000 + this.random() * 20_000;
          walk.pauseUntil = now + 5000 + this.random() * 4000;
          walk.stop = this.chooseStop(walk.stop);
          npc.workstationId = npc.workStartedAt = undefined;
        }

        continue;
      }

      if (!returning && now < walk.pauseUntil) {
        npc.moving = false;
        continue;
      }

      const target =
        returning && station
          ? station.worker
          : VILLAGE_DEFINITION.npcStops[walk.stop % VILLAGE_DEFINITION.npcStops.length];
      const dx = wrappedDelta(target.x, npc.x, VILLAGE_DEFINITION.geometry.width),
        dy = wrappedDelta(target.y, npc.y, VILLAGE_DEFINITION.geometry.height);
      const distance = Math.hypot(dx, dy);
      const step = Math.min(distance, SPEED * dt);
      if (distance < 1) {
        npc.x = target.x;
        npc.y = target.y;
        if (returning && station) {
          walk.work = { remaining: 60_000 + this.random() * 30_000, elapsed: 0 };
          npc.workstationId = station.id;
          npc.workStartedAt = now;
          npc.angle = Math.atan2(station.y - npc.y + 6, station.x - npc.x);
        } else {
          walk.stop = this.chooseStop(walk.stop);
          walk.pauseUntil = now + 5000 + this.random() * 4000;
        }

        npc.moving = false;
      } else {
        npc.angle = Math.atan2(dy, dx);
        npc.x = wrap(npc.x + (dx / distance) * step, VILLAGE_DEFINITION.geometry.width);
        npc.y = wrap(npc.y + (dy / distance) * step, VILLAGE_DEFINITION.geometry.height);
        npc.moving = true;
      }
    }
  }
}
