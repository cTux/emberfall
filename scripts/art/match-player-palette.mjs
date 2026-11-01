export function matchPlayerPalette({
  output,
  frames,
  scale,
  strides,
  strideScale,
  repairScale,
  walkRows,
  name,
}) {
  // The shipped atlas uses four facings and 128 px physical cells (64 px at 2x).
  const atlasLayout = { facings: 4, cell: 128 };
  // Canvas pixels have four RGBA channels and 256 possible values per byte.
  const pixelLayout = { channels: 4, alpha: 3, byteValues: 256 };
  // Sample palette tones only from pixels at least half opaque to avoid fringe colors.
  const PALETTE_ALPHA_THRESHOLD = 128;
  const out = output.getContext('2d');
  // Each turnaround has its own lighting/material palette. Match RGB only:
  // keep every alpha value, silhouette, gait, anchor and non-walk pixel.
  const atlas = out.getImageData(0, 0, output.width, output.height);
  const pixels = atlas.data;

  for (let col = 0; col < atlasLayout.facings; col++) {
    const palette = new Map();

    for (let y = 0; y < atlasLayout.cell; y++) {
      for (let x = col * atlasLayout.cell; x < (col + 1) * atlasLayout.cell; x++) {
        const i = (y * output.width + x) * pixelLayout.channels;

        if (pixels[i + pixelLayout.alpha] < PALETTE_ALPHA_THRESHOLD) {
          continue;
        }

        const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
        palette.set(rgb.join(','), rgb);
      }
    }

    if (!palette.size) {
      throw new Error(`${name} direction ${col}: empty idle palette`);
    }

    const colors = [...palette.values()];
    // Match the overall tonal distribution too: palette membership alone
    // still allows a walk sheet to overuse the standing highlights.
    const samples = (rows) => {
      const channels = [[], [], []];

      for (const row of rows) {
        for (let y = row * atlasLayout.cell; y < (row + 1) * atlasLayout.cell; y++) {
          for (let x = col * atlasLayout.cell; x < (col + 1) * atlasLayout.cell; x++) {
            const i = (y * output.width + x) * pixelLayout.channels;

            if (pixels[i + pixelLayout.alpha] < PALETTE_ALPHA_THRESHOLD) {
              continue;
            }

            channels.forEach((values, channel) => {
              return values.push(pixels[i + channel]);
            });
          }
        }
      }

      return channels.map((values) => {
        return values.sort((a, b) => {
          return a - b;
        });
      });
    };

    const standing = samples([0]);
    const walking = samples(walkRows);
    const tones = walking.map((values, channel) => {
      return Array.from({ length: pixelLayout.byteValues }, (_, value) => {
        const first = values.findIndex((sample) => {
          return sample >= value;
        });
        const last = values.findLastIndex((sample) => {
          return sample <= value;
        });
        const rank = ((first < 0 ? values.length - 1 : first) + Math.max(0, last)) / 2;

        return standing[channel][
          Math.round((rank / (values.length - 1)) * (standing[channel].length - 1))
        ];
      });
    });
    const matches = new Map();

    for (const row of walkRows) {
      for (let y = row * atlasLayout.cell; y < (row + 1) * atlasLayout.cell; y++) {
        for (let x = col * atlasLayout.cell; x < (col + 1) * atlasLayout.cell; x++) {
          const i = (y * output.width + x) * pixelLayout.channels;

          if (!pixels[i + pixelLayout.alpha]) {
            continue;
          }

          const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
          const key = rgb.join(',');
          let match = matches.get(key);

          if (!match) {
            const tone = rgb.map((value, channel) => {
              return tones[channel][value];
            });
            let distance = Infinity;

            for (const color of colors) {
              const delta = tone.reduce((sum, value, channel) => {
                return sum + (value - color[channel]) ** 2;
              }, 0);

              if (delta < distance) {
                distance = delta;
                match = color;
              }
            }

            matches.set(key, match);
          }

          pixels.set(match, i);
        }
      }
    }
  }

  out.putImageData(atlas, 0, 0);

  return {
    png: output.toDataURL().split(',')[1],
    frames,
    scale,
    strides,
    strideScale,
    repairScale,
  };
}
