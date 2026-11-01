import { wrappedDelta, type Player, type WorldState } from '@emberfall/common';
import { FOREST, resourceNodes, resourceState } from '@emberfall/core';
import { sceneryInteraction, type InteractionTarget } from './interaction-targets';
import { resourceScenery } from './gathering';
import { portalInteraction } from './portal';

// Tall scenery can remain clickable while its ground point is just outside the camera.
const SCENERY_VIEWPORT_MARGIN = 150;

export function forestInteractionTargets(
  view: WorldState | null,
  local: Player | undefined,
  camera: { width: number; height: number },
) {
  let targets: InteractionTarget[] = [];

  if (local?.scene === 'forest' && view?.scene?.phase === 'ended') {
    targets = view.scene.portals.map((portal) => {
      return portalInteraction(
        { id: 'return', name: 'Return to village', ...portal },
        local.x + wrappedDelta(portal.x, local.x, FOREST.width),
        local.y + wrappedDelta(portal.y, local.y, FOREST.height),
      );
    });
  }

  if (local?.scene === 'forest') {
    targets.push(
      ...resourceNodes(local, Math.hypot(camera.width, camera.height) / 2 + SCENERY_VIEWPORT_MARGIN)
        .filter((node) => {
          return resourceState(view?.resources, node, view?.serverNow ?? 0)?.remaining !== 0;
        })
        .map((node) => {
          return sceneryInteraction(resourceScenery(node));
        })
        .filter((target) => {
          return target !== null;
        }),
    );
    targets.sort((a, b) => {
      return a.y + a.height - b.y - b.height;
    });
  }

  return targets;
}
