/** Soften baked outlines toward nearby material colors without expanding silhouettes. */
export function softenArtTones(pixels: Uint8ClampedArray, width: number, height: number) {
  const original = pixels.slice();
  const light = (i: number) =>
    original[i] * 0.2126 + original[i + 1] * 0.7152 + original[i + 2] * 0.0722;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (!original[offset + 3]) continue;
      const brightness = Math.max(original[offset], original[offset + 1], original[offset + 2]);
      const blend = 0.28 * Math.max(0, 1 - brightness / 100);
      let neighbor = offset;
      if (blend > 0)
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
            const candidate = ((y + dy) * width + x + dx) * 4;
            if (original[candidate + 3] < 200) continue;
            if (light(candidate) > light(neighbor)) neighbor = candidate;
          }
      for (let channel = 0; channel < 3; channel++)
        pixels[offset + channel] =
          (original[offset + channel] * (1 - blend) + original[neighbor + channel] * blend) * 0.96 +
          6;
    }
}
