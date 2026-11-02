import type { DimensionId } from '@emberfall/core/contracts';
import { FOREST_VIEW } from './forest-calibration.ts';
// Preserve the legacy seeded fallback scatter until terrain PNGs finish loading.
import { terrainArt, environmentArt, terrainTile } from './art';
import { dimensionArt } from './dimension-art';

// Preserve the legacy seeded fallback scatter until terrain PNGs finish loading.
const GROUND_SCATTER = { seed: 512, samples: 700, colorPeriod: 3, terrainColumn: 2 } as const;

// Numerical Recipes' 32-bit LCG parameters preserve the deterministic fallback texture.
const LCG = { multiplier: 1664525, increment: 1013904223, range: 4294967296 } as const;

export function createForestGround() {
  let groundReady: DimensionId | undefined;
  const ground = document.createElement('canvas') as HTMLCanvasElement & {
    textureRevision?: number;
  };
  ground.width = ground.height = FOREST_VIEW.tileSize;
  const g = ground.getContext('2d')!;
  g.fillStyle = '#22392d';
  g.fillRect(0, 0, 320, 320);
  let seed: number = GROUND_SCATTER.seed;
  const random = () => {
    seed = (Math.imul(seed, LCG.multiplier) + LCG.increment) >>> 0;

    return seed / LCG.range;
  };

  for (let i = 0; i < GROUND_SCATTER.samples; i++) {
    g.fillStyle = i % GROUND_SCATTER.colorPeriod ? '#49654332' : '#132c2544';
    g.fillRect(random() * 320, random() * 320, 2 + random() * 6, 1 + random() * 3);
  }

  return (dimension: DimensionId = 'forest') => {
    const source = dimension === 'forest' ? terrainArt : dimensionArt(dimension, 'terrain');

    if (
      environmentArt.naturalWidth &&
      source.complete &&
      source.naturalWidth &&
      groundReady !== dimension
    ) {
      groundReady = dimension;
      g.fillStyle = g.createPattern(
        terrainTile(GROUND_SCATTER.terrainColumn, FOREST_VIEW.tileSize, source),
        'repeat',
      )!;
      g.fillRect(0, 0, 320, 320);
      ground.textureRevision = (ground.textureRevision ?? 0) + 1;
    }

    return ground;
  };
}
