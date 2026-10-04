import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

// Mechanical atlas packaging only: art and handedness are authored in the sources.
const root = "packages/client-new/public/assets/wardrobe-style";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const name of ["warrior", "ranger", "mage", "druid"]) {
    const source = await readFile(`${root}/${name}-complete.png`);
    const stride = await readFile(`${root}/${name}-stride.png`);
    const repair = await readFile(`${root}/${name}-stride-revised.png`);
    const extra = ["warrior", "mage", "druid"].includes(name)
      ? await readFile(`${root}/${name}-extra.png`)
      : null;
    const packed = await page.evaluate(
      async ({ source, name, extra, stride, repair }) => {
        const sources = [source, ...(extra ? [extra] : []), stride, repair];
        const strideIndex = sources.length - 2;
        const allFrames = [];
        const images = [];
        for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
          const isStride = sourceIndex >= strideIndex;
          const rowCount = isStride
            ? 6
            : sourceIndex
              ? name === "warrior"
                ? 3
                : name === "druid"
                  ? 10
                  : 1
              : name === "warrior"
                ? 9
                : 10;
          const image = new Image();
          image.src = `data:image/png;base64,${sources[sourceIndex]}`;
          await image.decode();
          images.push(image);
          const input = document.createElement("canvas");
          input.width = image.width;
          input.height = image.height;
          const ctx = input.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(image, 0, 0);
          const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
          const visited = new Uint8Array(image.width * image.height);
          const components = [];
          for (let start = 0; start < visited.length; start++) {
            if (visited[start] || pixels[start * 4 + 3] <= 32) continue;
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
              for (let dy = -1; dy <= 1; dy++)
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
                  )
                    continue;
                  visited[next] = 1;
                  queue.push(next);
                }
            }
            if (queue.length > 100)
              components.push({
                left,
                top,
                width: right - left,
                height: bottom - top,
                area: queue.length,
              });
          }
          // The revised druid's last two fallen poses touch; source them from the
          // earlier sheet instead of slicing through their shared pixels.
          if (name === "druid" && sourceIndex === 0 && components.length === 39) {
            const merged = components.findIndex(
              (f) => f.top > image.height * 0.9 && f.width > image.width / 3,
            );
            if (merged >= 0) components.splice(merged, 1);
          }
          if (components.length !== (name === "druid" && sourceIndex === 0 ? 38 : rowCount * 4))
            throw new Error(
              `${name} source ${sourceIndex}: expected ${rowCount * 4} isolated sprites, got ${components.length}; ${JSON.stringify(components)}`,
            );
          components.sort((a, b) => a.top + a.height / 2 - (b.top + b.height / 2));
          const frames = [];
          for (let row = 0; row < rowCount; row++) {
            const group = components.slice(row * 4, row * 4 + 4).sort((a, b) => a.left - b.left);
            group.forEach((f, col) => frames.push({ ...f, row, col, sourceIndex }));
          }
          allFrames.push(...frames.map((frame) => ({ ...frame, isStride })));
        }
        let frames = allFrames.filter((f) => f.sourceIndex === 0);
        if (name === "warrior") {
          frames = frames
            .filter((f) => f.row < 6 || f.row === 8)
            .map((f) => ({ ...f, row: f.row === 8 ? 9 : f.row }));
          frames.push(
            ...allFrames
              .filter((f) => f.sourceIndex === 1 && !f.isStride)
              .map((f) => ({ ...f, row: f.row + 6 })),
          );
        }
        if (name === "druid")
          frames.push(...allFrames.filter((f) => f.sourceIndex === 1 && f.row === 9 && f.col >= 2));
        if (name === "mage") {
          frames = frames.filter((f) => f.row !== 0);
          frames.push(...allFrames.filter((f) => f.sourceIndex === 1));
        }
        // Side-on casts retain the far weapon arm; do not use a source pose
        // that transfers the staff to the visible, anatomical left hand.
        if (name === "mage" || name === "druid") {
          const safe = frames.find((f) => f.col === 2 && f.row === 6);
          frames = frames.map((f) =>
            f.col === 2 && (f.row === 7 || f.row === 8) ? { ...safe, row: f.row } : f,
          );
        }
        const baseHeight = Math.max(
          ...allFrames.filter((f) => f.sourceIndex === 0 && f.row === 0).map((f) => f.height),
        );
        const extraHeight = Math.max(
          ...allFrames.filter((f) => f.sourceIndex === 1 && f.row === 0).map((f) => f.height),
        );
        frames = frames.map((f) => ({
          ...f,
          unitScale: f.sourceIndex ? baseHeight / extraHeight : 1,
        }));
        const scale = Math.min(
          58 / Math.max(...frames.map((f) => f.width * f.unitScale)),
          56 / Math.max(...frames.map((f) => f.height * f.unitScale)),
        );
        const output = document.createElement("canvas");
        output.width = 256;
        output.height = 640;
        const out = output.getContext("2d");
        out.imageSmoothingEnabled = false;
        const rows = [0, 1, 2, 3, 4, 8, 9, 5, 6, 7];
        for (const f of frames) {
          const width = Math.round(f.width * f.unitScale * scale),
            height = Math.round(f.height * f.unitScale * scale);
          out.drawImage(
            images[f.sourceIndex],
            f.left,
            f.top,
            f.width,
            f.height,
            f.col * 64 + Math.floor((64 - width) / 2),
            rows[f.row] * 64 + 61 - height,
            width,
            height,
          );
        }
        const originalStrides = allFrames.filter((f) => f.sourceIndex === strideIndex);
        const revisedStrides = allFrames.filter((f) => f.sourceIndex === strideIndex + 1);
        // Preserve explicitly accepted directions byte-for-byte, including their
        // original normalization; a revised sheet must not rescale those cells.
        const approved = name === "warrior" ? [2, 3] : name === "ranger" ? [0] : [];
        const strides = [
          ...originalStrides.filter((f) => approved.includes(f.col)),
          ...revisedStrides.filter((f) => !approved.includes(f.col)),
        ];
        const strideScale = Math.min(
          58 / Math.max(...originalStrides.map((f) => f.width)),
          (baseHeight * scale) / Math.max(...originalStrides.map((f) => f.height)),
        );
        const repairScale = Math.min(
          58 / Math.max(...revisedStrides.map((f) => f.width)),
          (baseHeight * scale) / Math.max(...revisedStrides.map((f) => f.height)),
        );
        const walkRows = [1, 2, 3, 4, 8, 9];
        for (const f of strides) {
          const frameScale = f.sourceIndex === strideIndex ? strideScale : repairScale;
          const width = Math.round(f.width * frameScale);
          const height = Math.round(f.height * frameScale);
          const y = walkRows[f.row] * 64;
          out.clearRect(f.col * 64, y, 64, 64);
          out.drawImage(
            images[f.sourceIndex],
            f.left,
            f.top,
            f.width,
            f.height,
            f.col * 64 + Math.floor((64 - width) / 2),
            y + 61 - height,
            width,
            height,
          );
        }
        return {
          png: output.toDataURL().split(",")[1],
          frames,
          scale,
          strides,
          strideScale,
          repairScale,
        };
      },
      {
        source: source.toString("base64"),
        name,
        extra: extra?.toString("base64"),
        stride: stride.toString("base64"),
        repair: repair.toString("base64"),
      },
    );
    await writeFile(`${root}/${name}-atlas.png`, Buffer.from(packed.png, "base64"));
    await writeFile(
      `${root}/${name}-atlas.json`,
      JSON.stringify(
        {
          scale: packed.scale,
          frames: packed.frames,
          strideScale: packed.strideScale,
          repairScale: packed.repairScale,
          strides: packed.strides,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(`${name}: ${packed.frames.length} isolated frames, scale ${packed.scale}`);
  }
} finally {
  await browser.close();
}
