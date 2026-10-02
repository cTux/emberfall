import { FOREST, forestTrees, wrap } from "@emberfall/common";
import { spriteMask } from "./lighting.ts";

const village = [
  { x: 280, y: 278, kind: "cat" },
  { x: 650, y: 278, kind: "chicken" },
  { x: 385, y: 445, kind: "chicken" },
  { x: 590, y: 470, kind: "cat" },
  { x: 300, y: 550, kind: "chicken" },
  { x: 660, y: 550, kind: "cat" },
];

export function crittersAt(
  area: "village" | "forest",
  now: number,
  bounds: { x: number; y: number; width: number; height: number },
) {
  const homes = area === "village" ? village : [];
  if (area === "forest") {
    for (
      let row = Math.floor((bounds.y - 40) / 320);
      row <= (bounds.y + bounds.height + 40) / 320;
      row++
    )
      for (
        let col = Math.floor((bounds.x - 40) / 320);
        col <= (bounds.x + bounds.width + 40) / 320;
        col++
      ) {
        const c = wrap(col, FOREST.width / 320),
          r = wrap(row, FOREST.height / 320);
        if ((c + r * 3) % 2) continue;
        const x = col * 320 + 120,
          y = row * 320 + 180;
        if (forestTrees(x, y, 60).some((t) => Math.hypot(t.x - x, t.y - y) < 55)) continue;
        homes.push({ x, y, kind: "raccoon" });
      }
  }
  return homes
    .map((home) => {
      const phase =
        ((now + wrap(home.x, FOREST.width) * 37 + wrap(home.y, FOREST.height) * 19) % 12000) / 1000;
      const moving = phase < 4 || (phase >= 6 && phase < 10);
      const offset = phase < 4 ? phase * 10 : phase < 6 ? 40 : phase < 10 ? (10 - phase) * 10 : 0;
      return {
        ...home,
        x: home.x + offset - 20,
        left: phase >= 6,
        frame: moving ? Math.floor(now / 180) % 2 : 0,
      };
    })
    .filter(
      (p) =>
        p.x >= bounds.x - 24 &&
        p.x <= bounds.x + bounds.width + 24 &&
        p.y >= bounds.y - 24 &&
        p.y <= bounds.y + bounds.height + 24,
    );
}

const images = new Map<string, HTMLImageElement>();
function critterImage(kind: string) {
  let image = images.get(kind);
  if (!image) {
    image = new Image();
    image.src = `/assets/critter-${kind}.png`;
    images.set(kind, image);
  }
  return image;
}
export function critterCaster(critter: ReturnType<typeof crittersAt>[number]) {
  const mask = spriteMask(critterImage(critter.kind), critter.frame, 0, critter.left, 16, true);
  return mask
    ? {
        id: `critter:${critter.kind}:${critter.x}:${critter.y}`,
        x: critter.x,
        y: critter.y - 24 + mask.height * 1.5,
        width: 24,
        height: mask.height * 1.5,
        mask,
      }
    : null;
}
export function drawCritter(
  ctx: CanvasRenderingContext2D,
  critter: ReturnType<typeof crittersAt>[number],
  shadows = false,
) {
  const image = critterImage(critter.kind);
  if (!image.naturalWidth) return;
  ctx.save();
  ctx.translate(critter.x, critter.y);
  if (!shadows) {
    ctx.fillStyle = "#06181050";
    ctx.beginPath();
    ctx.ellipse(0, -2, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (critter.left) ctx.scale(-1, 1);
  ctx.drawImage(image, critter.frame * 16, 0, 16, 16, -12, -24, 24, 24);
  ctx.restore();
}
