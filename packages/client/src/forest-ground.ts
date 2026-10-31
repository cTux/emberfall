import { environmentArt, terrainArt, terrainTile } from './art';

export function createForestGround() {
  let groundReady = false;
  const ground = document.createElement('canvas');
  ground.width = ground.height = 320;
  const g = ground.getContext('2d')!;
  g.fillStyle = '#22392d';
  g.fillRect(0, 0, 320, 320);
  let seed = 512;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

    return seed / 4294967296;
  };

  for (let i = 0; i < 700; i++) {
    g.fillStyle = i % 3 ? '#49654332' : '#132c2544';
    g.fillRect(random() * 320, random() * 320, 2 + random() * 6, 1 + random() * 3);
  }

  return () => {
    if (
      environmentArt.naturalWidth &&
      terrainArt.complete &&
      terrainArt.naturalWidth &&
      !groundReady
    ) {
      groundReady = true;
      g.fillStyle = g.createPattern(terrainTile(2), 'repeat')!;
      g.fillRect(0, 0, 320, 320);
    }

    return ground;
  };
}
