export async function isolatePlayerFrames({ source, name, extra, stride, repair, config }) {
  // Source layout has four facings and six stride rows; these are authored sheet coordinates.
  const sourceLayout = { facings: 4, strideRows: 6, strideSources: 2 };
  // Canvas stores four RGBA channels, with alpha in its final channel.
  const pixelLayout = { channels: 4, alpha: 3 };
  // Ignore nearly transparent pixels and specks smaller than a sprite when finding components.
  const componentFilter = { alphaCutoff: 32, minimumArea: 100 };
  // The original druid has 39 components before removing one merged bottom-row pose.
  const druidLayout = {
    mergedComponents: 39,
    isolatedComponents: 38,
    bottomFraction: 0.9,
    mergedWidthDivisor: 3,
  };
  const sources = [source, ...(extra ? [extra] : []), stride, repair];
  const strideIndex = sources.length - sourceLayout.strideSources;
  const allFrames = [];
  const images = [];

  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
    const isStride = sourceIndex >= strideIndex;
    const rowCount = isStride
      ? sourceLayout.strideRows
      : sourceIndex
        ? config.extraRows
        : config.rows;
    const image = new Image();
    image.src = `data:image/png;base64,${sources[sourceIndex]}`;
    await image.decode();
    images.push(image);
    const input = document.createElement('canvas');
    input.width = image.width;
    input.height = image.height;
    const ctx = input.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    const visited = new Uint8Array(image.width * image.height);
    const components = [];

    for (let start = 0; start < visited.length; start++) {
      if (
        visited[start] ||
        pixels[start * pixelLayout.channels + pixelLayout.alpha] <= componentFilter.alphaCutoff
      ) {
        continue;
      }

      const queue = [start];
      visited[start] = 1;
      let left = image.width,
        right = 0,
        top = image.height,
        bottom = 0;

      for (let i = 0; i < queue.length; i++) {
        const point = queue[i],
          x = point % image.width,
          y = Math.floor(point / image.width);
        left = Math.min(left, x);
        right = Math.max(right, x + 1);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y + 1);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx,
              ny = y + dy,
              next = ny * image.width + nx;

            if (
              nx < 0 ||
              nx >= image.width ||
              ny < 0 ||
              ny >= image.height ||
              visited[next] ||
              pixels[next * pixelLayout.channels + pixelLayout.alpha] <= componentFilter.alphaCutoff
            ) {
              continue;
            }

            visited[next] = 1;
            queue.push(next);
          }
        }
      }

      if (queue.length > componentFilter.minimumArea) {
        components.push({
          left,
          top,
          width: right - left,
          height: bottom - top,
          area: queue.length,
        });
      }
    }

    // The revised druid's last two fallen poses touch; source them from the
    // earlier sheet instead of slicing through their shared pixels.
    if (
      name === 'druid' &&
      sourceIndex === 0 &&
      components.length === druidLayout.mergedComponents
    ) {
      const merged = components.findIndex((f) => {
        return (
          f.top > image.height * druidLayout.bottomFraction &&
          f.width > image.width / druidLayout.mergedWidthDivisor
        );
      });

      if (merged >= 0) {
        components.splice(merged, 1);
      }
    }

    if (
      components.length !==
      (name === 'druid' && sourceIndex === 0
        ? druidLayout.isolatedComponents
        : rowCount * sourceLayout.facings)
    ) {
      throw new Error(
        `${name} source ${sourceIndex}: expected ${rowCount * sourceLayout.facings} isolated sprites, got ${components.length}; ${JSON.stringify(components)}`,
      );
    }

    components.sort((a, b) => {
      return a.top + a.height / 2 - (b.top + b.height / 2);
    });
    const frames = [];

    for (let row = 0; row < rowCount; row++) {
      const group = components
        .slice(row * sourceLayout.facings, row * sourceLayout.facings + sourceLayout.facings)
        .sort((a, b) => {
          return a.left - b.left;
        });
      group.forEach((f, col) => {
        return frames.push({ ...f, row, col, sourceIndex });
      });
    }

    allFrames.push(
      ...frames.map((frame) => {
        return { ...frame, isStride };
      }),
    );
  }

  return { allFrames, images, strideIndex };
}
