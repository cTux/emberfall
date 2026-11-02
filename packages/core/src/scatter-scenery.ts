import type { VillageDecoration } from './village-decoration.ts';
import { sceneryClearing } from './scenery-clearing.ts';
import { SCENERY_RANDOM } from './scenery-seed.ts';
import { SCENERY_BOUNDS, SCENERY_CLEARANCE } from './village-layout.ts';
import { ARENA } from './definitions/worlds/village.ts';

export function scatterScenery(
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
