const reflection = document.createElement("canvas");
const context = reflection.getContext("2d")!;

/** Faded sprite mirror on the ground, anchored at the sprite's bottom edge. */
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
  ctx.drawImage(reflection, x - width / 2, y, width, height * 0.45);
}
