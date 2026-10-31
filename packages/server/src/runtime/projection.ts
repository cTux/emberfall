import type { Player, WorldState } from '@emberfall/common';
import { MAX_PLAYERS } from '@emberfall/core';
import { sceneState } from '../scenes.ts';
import type { World } from './models.ts';
import type { WorldMembership } from './world-membership.ts';

export function createWorldProjection(
  parties: WorldMembership['parties'],
  resourceOwner: WorldMembership['resourceOwner'],
) {
  const state = (world: World, now = Date.now(), viewer?: Player): WorldState => {
    return {
      id: world.id,
      name: world.name,
      hostId: world.hostId,
      players: [...world.players.values()].filter((p) => {
        return (
          !p.scene ||
          !viewer?.scene ||
          (p.partyId && p.partyId === viewer.partyId) ||
          parties(world).key(p) === parties(world).key(viewer)
        );
      }),
      partyRequests: viewer
        ? parties(world)
            .incoming(viewer, now)
            .map(({ fromId, expiresAt }) => {
              return { fromId, expiresAt };
            })
        : [],
      chat: (world.chat ?? [])
        .filter((m) => {
          return !m.recipientIds || (!!viewer && m.recipientIds.includes(viewer.id));
        })
        .filter((m) => {
          return !m.dimension || m.dimension === (viewer?.scene ?? 'village');
        })
        .slice(-10),
      npcs: world.npcs,
      resources: resourceOwner(world, viewer).resources,
      scene: sceneState(viewer ? parties(world).run(viewer).scene : undefined),
      training: world.training,
      serverNow: now,
      merchant: world.merchant,
    };
  };

  const list = (worlds: ReadonlyMap<string, World>, permanentWorld: World) => {
    return {
      type: 'worlds' as const,
      worlds: [...worlds.values()].map((w) => {
        return {
          id: w.id,
          name: w.name,
          locked: !!w.hash,
          players: w.players.size,
          capacity: w === permanentWorld ? 32 : MAX_PLAYERS,
        };
      }),
    };
  };

  return { state, list };
}
