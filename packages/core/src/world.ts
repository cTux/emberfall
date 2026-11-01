import { onPath } from './village-paths.ts';
export { PATHS, onPath } from './village-paths.ts';
import { COLLISION } from './definitions/collision.ts';
import { SCENERY_RANDOM } from './scenery-seed.ts';
import {
  TRAINING_FOOTPRINT,
  PLAZA,
  SCENERY_CLEARANCE,
  SCENERY_BOUNDS,
  VILLAGE_TREE,
  ROCK_SCATTER,
  PLANT_SCATTER,
  VILLAGE_OBSTACLES,
} from './village-layout.ts';
import {
  ARENA,
  WARDROBE,
  TRAINING_ZONES,
  BUILDINGS,
  TORCHES,
  VILLAGE_DEFINITION,
} from './definitions/worlds/village.ts';
import { PLANT_KINDS } from './plants.ts';
export { ARENA, WARDROBE, TRAINING_ZONES, BUILDINGS, TORCHES };
export const BULLSEYE = VILLAGE_DEFINITION.workstations.find((station) => {
  return station.id === 'lodge-target';
});
import { wrap, wrappedDelta } from '@emberfall/common';

export const inTrainingZone = (player: { x: number; y: number }) => {
  return TRAINING_ZONES.some((zone) => {
    return (
      Math.hypot(
        wrappedDelta(player.x, zone.x, ARENA.width) / zone.radius,
        wrappedDelta(player.y + COLLISION.feetOffset, zone.y, ARENA.height) /
          (zone.radius * TRAINING_FOOTPRINT.yScale),
      ) <= 1
    );
  });
};

export interface Tree {
  x: number;
  y: number;
  size: number;
  radius: number;
}
const trees: Tree[] = [];
let seed: number = VILLAGE_DEFINITION.treeSeed;
const random = () => {
  seed = (Math.imul(seed, SCENERY_RANDOM.multiplier) + SCENERY_RANDOM.increment) >>> 0;

  return seed / SCENERY_RANDOM.modulus;
};

function sceneryClearing(x: number, y: number) {
  return (
    TRAINING_ZONES.some((zone) => {
      return Math.hypot(x - zone.x, y - zone.y) < zone.clearingRadius + SCENERY_CLEARANCE.training;
    }) ||
    Math.hypot((x - PLAZA.x) / PLAZA.clearingX, (y - PLAZA.y) / PLAZA.clearingY) < 1 ||
    onPath(x, y, SCENERY_CLEARANCE.path) ||
    BUILDINGS.some((b) => {
      return (
        Math.abs(x - b.x) < SCENERY_CLEARANCE.buildingX &&
        y > b.y - SCENERY_CLEARANCE.buildingAbove &&
        y < b.y + SCENERY_CLEARANCE.buildingBelow
      );
    }) ||
    TORCHES.some((t) => {
      return Math.hypot(t.x - x, t.y - y) < SCENERY_CLEARANCE.torch;
    })
  );
}

for (let i = 0; i < VILLAGE_DEFINITION.treeAttempts; i++) {
  const x = SCENERY_BOUNDS.left + random() * (ARENA.width - SCENERY_BOUNDS.horizontalInset);
  const y = SCENERY_BOUNDS.top + random() * (ARENA.height - SCENERY_BOUNDS.verticalInset);

  if (sceneryClearing(x, y)) {
    continue;
  }

  if (
    trees.some((tree) => {
      return Math.hypot(tree.x - x, tree.y - y) < SCENERY_CLEARANCE.separation;
    })
  ) {
    continue;
  }

  trees.push({
    x,
    y,
    size: VILLAGE_TREE.minSize + Math.floor(random() * VILLAGE_TREE.sizeRange),
    radius: VILLAGE_TREE.radius,
  });
}

export const TREES: readonly Readonly<Tree>[] = Object.freeze(
  trees.map((tree) => {
    return Object.freeze(tree);
  }),
);

export { PLANT_KINDS } from './plants.ts';
export interface VillageDecoration {
  x: number;
  y: number;
  size: number;
  variant: number;
}

function scatterScenery(
  initialSeed: number,
  attempts: number,
  minSize: number,
  sizeRange: number,
  variants: number,
  occupied: readonly { x: number; y: number }[],
): readonly Readonly<VillageDecoration>[] {
  let decorationSeed = initialSeed;
  const roll = () => {
    decorationSeed =
      (Math.imul(decorationSeed, SCENERY_RANDOM.multiplier) + SCENERY_RANDOM.increment) >>> 0;

    return decorationSeed / SCENERY_RANDOM.modulus;
  };

  const decorations: VillageDecoration[] = [];

  for (let i = 0; i < attempts; i++) {
    const x = SCENERY_BOUNDS.left + roll() * (ARENA.width - SCENERY_BOUNDS.horizontalInset);
    const y = SCENERY_BOUNDS.top + roll() * (ARENA.height - SCENERY_BOUNDS.verticalInset);

    if (sceneryClearing(x, y)) {
      continue;
    }

    if (
      occupied.some((object) => {
        return Math.hypot(object.x - x, object.y - y) < SCENERY_CLEARANCE.separation;
      })
    ) {
      continue;
    }

    if (
      decorations.some((object) => {
        return Math.hypot(object.x - x, object.y - y) < SCENERY_CLEARANCE.separation;
      })
    ) {
      continue;
    }

    decorations.push({
      x,
      y,
      size: minSize + Math.floor(roll() * sizeRange),
      variant: decorations.length % variants,
    });
  }

  return Object.freeze(
    decorations.map((object) => {
      return Object.freeze(object);
    }),
  );
}

export const ROCKS = scatterScenery(
  VILLAGE_DEFINITION.rockSeed ?? ROCK_SCATTER.seed,
  VILLAGE_DEFINITION.rockAttempts ?? ROCK_SCATTER.attempts,
  ROCK_SCATTER.minSize,
  ROCK_SCATTER.sizeRange,
  1,
  TREES,
);
export const PLANTS = scatterScenery(
  VILLAGE_DEFINITION.plantSeed ?? PLANT_SCATTER.seed,
  VILLAGE_DEFINITION.plantAttempts ?? PLANT_SCATTER.attempts,
  PLANT_SCATTER.minSize,
  PLANT_SCATTER.sizeRange,
  PLANT_KINDS.length,
  [...TREES, ...ROCKS],
);

/** Circle-body movement for players and enemies; coordinates are at their feet. */
export function moveActor(
  position: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
  collide = true,
  collideScenery = true,
) {
  if (!collide) {
    return {
      x: wrap(position.x + dx, ARENA.width),
      y: wrap(position.y + dy, ARENA.height),
    };
  }

  let { x, y } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 2)));
  // ponytail: scan this small fixed grove; index obstacles spatially when maps grow.
  const clear = (px: number, py: number) => {
    // Owner-position spawns must be able to escape a trunk they already overlap.
    return (
      TREES.every((tree) => {
        const distance = (tx: number, ty: number) => {
          return Math.hypot(
            wrappedDelta(tx, tree.x, ARENA.width),
            wrappedDelta(ty, tree.y - VILLAGE_TREE.trunkOffsetY, ARENA.height),
          );
        };

        return distance(px, py) >= Math.min(radius + tree.radius, distance(x, y));
      }) &&
      (!collideScenery ||
        (Math.hypot(px - WARDROBE.x, py - WARDROBE.y) >=
          radius + VILLAGE_OBSTACLES.wardrobeRadius &&
          TORCHES.every((t) => {
            return Math.hypot(px - t.x, py - t.y) >= radius + VILLAGE_OBSTACLES.torchRadius;
          }) &&
          BUILDINGS.every((b) => {
            return (
              Math.hypot(
                px -
                  Math.max(
                    b.x - b.sourceWidth + VILLAGE_OBSTACLES.buildingInset,
                    Math.min(b.x + b.sourceWidth - VILLAGE_OBSTACLES.buildingInset, px),
                  ),
                py - Math.max(b.y - VILLAGE_OBSTACLES.buildingDepth, Math.min(b.y, py)),
              ) >= radius
            );
          })))
    );
  };

  for (let i = 0; i < steps; i++) {
    const nextX = wrap(x + dx / steps, ARENA.width);

    if (clear(nextX, y)) {
      x = nextX;
    }

    const nextY = wrap(y + dy / steps, ARENA.height);

    if (clear(x, nextY)) {
      y = nextY;
    }
  }

  return { x, y };
}
