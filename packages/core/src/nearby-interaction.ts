import { forestDistance } from './forest-distance.ts';
import { anvilInRange } from './anvil-in-range.ts';
import { ANVIL } from './anvil.ts';
import { FOREST_PORTAL, INTERACTION_RADIUS, LOBBY_PORTAL } from './definitions/worlds/forest.ts';
import { COLLISION } from './definitions/collision.ts';
import { WARDROBE, BUILDINGS } from './world.ts';
import { VILLAGE_DEFINITION } from './definitions/worlds/village.ts';

// Existing interaction calibration matches the wardrobe and building doorway artwork.
const FIXTURE_INTERACTION = { wardrobeRadius: 55, doorwayOffsetY: 24 } as const;

export function nearbyInteraction(
  player: { x: number; y: number; scene?: string; hitpoints: number },
  ended = false,
  portals: { x: number; y: number }[] = [FOREST_PORTAL],
  npcs?: readonly { id: string; name: string; x: number; y: number }[],
) {
  if (player.hitpoints <= 0) {
    return null;
  }

  if (player.scene === 'forest') {
    const portal = portals.find((p) => {
      return forestDistance(player, p) < INTERACTION_RADIUS;
    });

    return ended && portal ? { id: 'return', name: 'Return to village', ...portal } : null;
  }

  const distance = (point: { x: number; y: number }) => {
    return forestDistance({ x: player.x, y: player.y + COLLISION.feetOffset }, point);
  };

  if (distance(LOBBY_PORTAL) < INTERACTION_RADIUS) {
    return { id: 'portal', name: 'Portal', ...LOBBY_PORTAL };
  }

  if (distance(WARDROBE) < FIXTURE_INTERACTION.wardrobeRadius) {
    return { id: 'wardrobe', name: 'Wardrobe', ...WARDROBE };
  }

  if (anvilInRange(player)) {
    return ANVIL!;
  }

  const trader = (npcs ?? VILLAGE_DEFINITION.villagers).find((npc) => {
    return (npc.id === 'innkeeper' || npc.id === 'craftsman') && distance(npc) < INTERACTION_RADIUS;
  });

  if (trader) {
    return { id: trader.id, name: trader.name, x: trader.x, y: trader.y };
  }

  const building = BUILDINGS.find((b) => {
    return (
      b.id !== 'inn' &&
      distance({ x: b.doorX, y: b.y + FIXTURE_INTERACTION.doorwayOffsetY }) < INTERACTION_RADIUS
    );
  });

  return building
    ? { id: building.id, name: building.name, x: building.doorX, y: building.y }
    : null;
}
