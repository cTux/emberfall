import { wrappedDelta, type WorldState, type Player } from '@emberfall/common';
import { ARENA, LOBBY_PORTAL, resourceNodes, resourceState } from '@emberfall/core';
import type { GraphicsSettings } from './graphics';
import { villageBackground } from './village-background';
import { resourceScenery } from './gathering';
import { npcScenery } from './npc-art';
import { portalInteraction } from './portal';

export function prepareVillageFrame(
  view: WorldState,
  local: Player | undefined,
  now: number,
  quality: GraphicsSettings,
  viewport: { width: number; height: number; scale: number },
) {
  const prepared = villageBackground(quality);
  const scenery = [
    ...(prepared?.scenery ?? []).filter((object) => {
      return !/^(tree|plant|rock):/.test(object.id);
    }),
    ...resourceNodes(
      { x: local?.x ?? 480, y: local?.y ?? 320 },
      Math.max(viewport.width, viewport.height) / viewport.scale + 200,
    ).map((node) => {
      const state = resourceState(view.resources, node, view.serverNow ?? now);
      const tree =
        node.kind === 'tree' && state?.remaining !== 0
          ? prepared?.scenery.find((object) => {
              return object.id === node.id;
            })
          : undefined;

      return {
        ...(tree ?? resourceScenery(node, state)),
        kind: node.kind,
        gathered: state?.remaining === 0,
      };
    }),
    ...npcScenery(view.npcs ?? [], view.serverNow ?? now),
  ];

  for (const object of scenery) {
    if (object.frames) {
      Object.assign(object, object.frames[Math.floor(now / 400) % object.frames.length]);
    }
  }

  const torchTextures = prepared?.torchTextures ?? [];
  const focus = local ?? { x: 480, y: 320 };
  const viewWidth = viewport.width / viewport.scale;
  const viewHeight = viewport.height / viewport.scale;
  const cameraX = focus.x - viewWidth / 2;
  const cameraY = focus.y - viewHeight / 2;
  const project = (x: number, y: number) => {
    return {
      x: focus.x + wrappedDelta(x, focus.x, ARENA.width),
      y: focus.y + wrappedDelta(y, focus.y, ARENA.height),
    };
  };

  const visibleScenery = scenery
    .map((object) => {
      return { ...object, ...project(object.x, object.y) };
    })
    .filter((object) => {
      return (
        object.x > cameraX - object.width / 2 - object.height * 2 &&
        object.x < cameraX + viewWidth + object.width / 2 + object.height * 2 &&
        object.y > cameraY - object.height * 2 &&
        object.y < cameraY + viewHeight + object.height * 2
      );
    });
  const portal = project(LOBBY_PORTAL.x, LOBBY_PORTAL.y);
  const portalTarget = portalInteraction(
    { id: 'portal', name: 'Forest portal', ...LOBBY_PORTAL },
    portal.x,
    portal.y,
  );

  return {
    view,
    local,
    now,
    quality,
    background: prepared?.background,
    torchTextures,
    visibleScenery,
    project,
    portal,
    portalTarget,
    camera: { x: cameraX, y: cameraY, width: viewWidth, height: viewHeight },
    diagnostics: {
      npcs: String(view.npcs?.length ?? 0),
      workstations: String(
        prepared?.scenery.filter((s) => {
          return s.id.startsWith('workstation:');
        }).length ?? 0,
      ),
      workingNpcIds: (view.npcs ?? [])
        .filter((n) => {
          return n.workstationId;
        })
        .map((n) => {
          return n.id;
        })
        .join(','),
      workingNpcs: String(
        view.npcs?.filter((n) => {
          return n.workstationId;
        }).length ?? 0,
      ),
      silencedNpcs: String(
        view.npcs?.filter((n) => {
          return n.silenced;
        }).length ?? 0,
      ),
    },
  };
}

export type VillageFrame = ReturnType<typeof prepareVillageFrame>;
