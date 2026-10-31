export async function isolatePlayerFrames({ source, name, extra, stride, repair, config }) {
  const sources = [source, ...(extra ? [extra] : []), stride, repair];
  const strideIndex = sources.length - 2;
  const allFrames = [];
  const images = [];
  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
    const isStride = sourceIndex >= strideIndex;
    const rowCount = isStride ? 6 : sourceIndex ? config.extraRows : config.rows;
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
      if (visited[start] || pixels[start * 4 + 3] <= 32) {
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
              pixels[next * 4 + 3] <= 32
            ) {
              continue;
            }

            visited[next] = 1;
            queue.push(next);
          }
        }
      }

      if (queue.length > 100) {
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
    if (name === 'druid' && sourceIndex === 0 && components.length === 39) {
      const merged = components.findIndex((f) => {
        return f.top > image.height * 0.9 && f.width > image.width / 3;
      });
      if (merged >= 0) {
        components.splice(merged, 1);
      }
    }

    if (components.length !== (name === 'druid' && sourceIndex === 0 ? 38 : rowCount * 4)) {
      throw new Error(
        `${name} source ${sourceIndex}: expected ${rowCount * 4} isolated sprites, got ${components.length}; ${JSON.stringify(components)}`,
      );
    }

    components.sort((a, b) => {
      return a.top + a.height / 2 - (b.top + b.height / 2);
    });
    const frames = [];
    for (let row = 0; row < rowCount; row++) {
      const group = components.slice(row * 4, row * 4 + 4).sort((a, b) => {
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
