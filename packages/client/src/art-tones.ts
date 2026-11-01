// Rec. 709 RGB luminance weights rank neighboring opaque material colors by perceived brightness.
const LUMINANCE = { red: 0.2126, green: 0.7152, blue: 0.0722 } as const;
// Existing outline calibration blends dark pixels by at most 28%, ignores translucent neighbors,
// then slightly compresses contrast; retain this approved palette treatment when repackaging art.
const TONE = {
  maximumBlend: 0.28,
  darkThreshold: 100,
  opaqueAlpha: 200,
  contrast: 0.96,
  lift: 6,
} as const;
// ImageData stores RGBA bytes: four channels with alpha in the fourth slot.
const PIXEL = { channels: 4, alpha: 3, colorChannels: 3 } as const;

/** Soften baked outlines toward nearby material colors without expanding silhouettes. */
export function softenArtTones(pixels: Uint8ClampedArray, width: number, height: number) {
  const original = pixels.slice();
  const light = (i: number) => {
    return (
      original[i] * LUMINANCE.red +
      original[i + 1] * LUMINANCE.green +
      original[i + 2] * LUMINANCE.blue
    );
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * PIXEL.channels;

      if (!original[offset + PIXEL.alpha]) {
        continue;
      }

      const brightness = Math.max(original[offset], original[offset + 1], original[offset + 2]);
      const blend = TONE.maximumBlend * Math.max(0, 1 - brightness / TONE.darkThreshold);
      let neighbor = offset;

      if (blend > 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) {
              continue;
            }

            const candidate = ((y + dy) * width + x + dx) * PIXEL.channels;

            if (original[candidate + PIXEL.alpha] < TONE.opaqueAlpha) {
              continue;
            }

            if (light(candidate) > light(neighbor)) {
              neighbor = candidate;
            }
          }
        }
      }

      for (let channel = 0; channel < PIXEL.colorChannels; channel++) {
        pixels[offset + channel] =
          (original[offset + channel] * (1 - blend) + original[neighbor + channel] * blend) *
            TONE.contrast +
          TONE.lift;
      }
    }
  }
}
