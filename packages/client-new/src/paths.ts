import { ARENA, PATHS } from "@emberfall/common-new";
import { terrainTile } from "./art";

/** Plain dirt at the buildings' 2x pixel scale, with continuous rounded joins. */
export function drawVillagePaths(ctx: CanvasRenderingContext2D, floor: HTMLImageElement) {
  if (!floor.naturalWidth) return;
  const paths = document.createElement("canvas");
  paths.width = ARENA.width / 2;
  paths.height = ARENA.height / 2;
  const mask = paths.getContext("2d")!;
  mask.scale(0.5, 0.5);
  mask.lineWidth = 48;
  mask.lineCap = mask.lineJoin = "round";
  mask.beginPath();
  mask.ellipse(480, 355, 110, 75, 0, 0, Math.PI * 2);
  mask.fill();
  for (const path of PATHS) {
    mask.beginPath();
    mask.moveTo(path[0].x, path[0].y);
    for (const point of path.slice(1)) mask.lineTo(point.x, point.y);
    mask.stroke();
  }
  // Only the center tile is dirt throughout; edge tiles contain bright grass.
  const tile = terrainTile(1, 64);
  mask.resetTransform();
  mask.globalCompositeOperation = "source-in";
  mask.fillStyle = mask.createPattern(tile, "repeat")!;
  mask.fillRect(0, 0, paths.width, paths.height);
  ctx.drawImage(paths, 0, 0, ARENA.width, ARENA.height);
}
