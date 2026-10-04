import {
  VILLAGE_CRITTERS,
  type CritterKind,
} from "@emberfall/common-new/definitions/entities/critters";
import { ARENA, FOREST, forestTrees, wrap, wrappedDelta } from "@emberfall/common-new";
export function crittersAt(
  area: "village" | "forest",
  now: number,
  bounds: { x: number; y: number; width: number; height: number },
) {
  const cx = bounds.x + bounds.width / 2,
    cy = bounds.y + bounds.height / 2;
  const homes: { x: number; y: number; kind: CritterKind }[] =
    area === "village"
      ? VILLAGE_CRITTERS.map((home) => ({
          ...home,
          x: cx + wrappedDelta(home.x, cx, ARENA.width),
          y: cy + wrappedDelta(home.y, cy, ARENA.height),
        }))
      : [];
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
        frame: moving ? 1 + (Math.floor(now / 180) % 3) : phase > 4.5 && phase < 5.5 ? 4 : 0,
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
