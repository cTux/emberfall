const reflection = document.createElement("canvas");
const context = reflection.getContext("2d")!;
const water = new WeakMap<CanvasRenderingContext2D, Path2D>();

/** Stable, uneven shorelines in world coordinates, shared by water and its reflections. */
export function puddlePath(puddles: readonly (readonly [number, number, number, number])[]) {
  const path = new Path2D();
  for (const [x, y, width, height] of puddles) {
    const phase = x * 0.13 + y * 0.07;
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const radius =
        0.78 +
        0.13 * Math.sin(angle * 3 + phase) +
        0.08 * Math.cos(angle * 5 - phase) +
        0.05 * Math.sin(angle * 7 + phase);
      const px = x + Math.cos(angle) * width * radius;
      const py = y + Math.sin(angle) * height * radius;
      if (i === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
    path.closePath();
  }
  return path;
}

export function drawPuddles(ctx: CanvasRenderingContext2D, path: Path2D) {
  water.set(ctx, path);
  ctx.save();
  ctx.fillStyle = "#152e39b0";
  ctx.fill(path);
  ctx.strokeStyle = "#91b6bc50";
  ctx.lineWidth = 1;
  ctx.stroke(path);
  ctx.restore();
}

/** Faded sprite mirror anchored at its bottom edge, visible only in water. */
export function drawReflection(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
  frame?: [number, number, number, number],
  flip = false,
) {
  const surface = water.get(ctx);
  if (!surface) return;
  if (reflection.width !== Math.ceil(width)) reflection.width = Math.ceil(width);
  if (reflection.height !== Math.ceil(height * 0.45)) reflection.height = Math.ceil(height * 0.45);
  context.resetTransform();
  context.clearRect(0, 0, reflection.width, reflection.height);
  context.globalCompositeOperation = "source-over";
  context.imageSmoothingEnabled = false;
  context.translate(flip ? reflection.width : 0, reflection.height);
  context.scale(flip ? -1 : 1, -1);
  if (frame) context.drawImage(image, ...frame, 0, 0, reflection.width, reflection.height);
  else context.drawImage(image, 0, 0, reflection.width, reflection.height);
  context.resetTransform();
  context.globalCompositeOperation = "destination-in";
  const fade = context.createLinearGradient(0, 0, 0, reflection.height);
  fade.addColorStop(0, "#ffffff40");
  fade.addColorStop(1, "#ffffff00");
  context.fillStyle = fade;
  context.fillRect(0, 0, reflection.width, reflection.height);
  ctx.save();
  ctx.clip(surface);
  ctx.drawImage(reflection, x - width / 2, y, width, height * 0.45);
  ctx.restore();
}
