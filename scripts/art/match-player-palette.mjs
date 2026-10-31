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
  const out = output.getContext('2d');
  // Each turnaround has its own lighting/material palette. Match RGB only:
  // keep every alpha value, silhouette, gait, anchor and non-walk pixel.
  const atlas = out.getImageData(0, 0, output.width, output.height);
  const pixels = atlas.data;
  for (let col = 0; col < 4; col++) {
    const palette = new Map();
    for (let y = 0; y < 128; y++)
      for (let x = col * 128; x < (col + 1) * 128; x++) {
        const i = (y * output.width + x) * 4;
        if (pixels[i + 3] < 128) continue;
        const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
        palette.set(rgb.join(','), rgb);
      }

    if (!palette.size) throw new Error(`${name} direction ${col}: empty idle palette`);
    const colors = [...palette.values()];
    // Match the overall tonal distribution too: palette membership alone
    // still allows a walk sheet to overuse the standing highlights.
    const samples = (rows) => {
      const channels = [[], [], []];
      for (const row of rows)
        for (let y = row * 128; y < (row + 1) * 128; y++)
          for (let x = col * 128; x < (col + 1) * 128; x++) {
            const i = (y * output.width + x) * 4;
            if (pixels[i + 3] < 128) continue;
            channels.forEach((values, channel) => values.push(pixels[i + channel]));
          }

      return channels.map((values) => values.sort((a, b) => a - b));
    };

    const standing = samples([0]);
    const walking = samples(walkRows);
    const tones = walking.map((values, channel) =>
      Array.from({ length: 256 }, (_, value) => {
        const first = values.findIndex((sample) => sample >= value);
        const last = values.findLastIndex((sample) => sample <= value);
        const rank = ((first < 0 ? values.length - 1 : first) + Math.max(0, last)) / 2;

        return standing[channel][
          Math.round((rank / (values.length - 1)) * (standing[channel].length - 1))
        ];
      }),
    );
    const matches = new Map();
    for (const row of walkRows)
      for (let y = row * 128; y < (row + 1) * 128; y++)
        for (let x = col * 128; x < (col + 1) * 128; x++) {
          const i = (y * output.width + x) * 4;
          if (!pixels[i + 3]) continue;
          const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
          const key = rgb.join(',');
          let match = matches.get(key);
          if (!match) {
            const tone = rgb.map((value, channel) => tones[channel][value]);
            let distance = Infinity;
            for (const color of colors) {
              const delta = tone.reduce(
                (sum, value, channel) => sum + (value - color[channel]) ** 2,
                0,
              );
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
