export function packPlayerFrames({ isolated, name, config }) {
  const { allFrames, images, strideIndex } = isolated;
  let frames = allFrames.filter((f) => {
    return f.sourceIndex === 0;
  });

  if (name === 'warrior') {
    frames = frames
      .filter((f) => {
        return f.row < 6 || f.row === 8;
      })
      .map((f) => {
        return { ...f, row: f.row === 8 ? 9 : f.row };
      });
    frames.push(
      ...allFrames
        .filter((f) => {
          return f.sourceIndex === 1 && !f.isStride;
        })
        .map((f) => {
          return { ...f, row: f.row + 6 };
        }),
    );
  }

  if (name === 'druid') {
    frames.push(
      ...allFrames.filter((f) => {
        return f.sourceIndex === 1 && f.row === 9 && f.col >= 2;
      }),
    );
  }

  if (name === 'mage') {
    frames = frames.filter((f) => {
      return f.row !== 0;
    });
    frames.push(
      ...allFrames.filter((f) => {
        return f.sourceIndex === 1;
      }),
    );
  }

  // Side-on casts retain the far weapon arm; do not use a source pose
  // that transfers the staff to the visible, anatomical left hand.
  if (name === 'mage' || name === 'druid') {
    const safe = frames.find((f) => {
      return f.col === 2 && f.row === 6;
    });
    frames = frames.map((f) => {
      return f.col === 2 && (f.row === 7 || f.row === 8) ? { ...safe, row: f.row } : f;
    });
  }

  const baseHeight = Math.max(
    ...allFrames
      .filter((f) => {
        return f.sourceIndex === 0 && f.row === 0;
      })
      .map((f) => {
        return f.height;
      }),
  );
  const extraHeight = Math.max(
    ...allFrames
      .filter((f) => {
        return f.sourceIndex === 1 && f.row === 0;
      })
      .map((f) => {
        return f.height;
      }),
  );
  frames = frames.map((f) => {
    return {
      ...f,
      unitScale: f.sourceIndex ? baseHeight / extraHeight : 1,
    };
  });
  const scale = Math.min(
    58 /
      Math.max(
        ...frames.map((f) => {
          return f.width * f.unitScale;
        }),
      ),
    56 /
      Math.max(
        ...frames.map((f) => {
          return f.height * f.unitScale;
        }),
      ),
  );
  const output = document.createElement('canvas');
  output.width = 512;
  output.height = 1280;
  const out = output.getContext('2d');
  out.imageSmoothingEnabled = false;
  out.scale(2, 2);
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

  const originalStrides = allFrames.filter((f) => {
    return f.sourceIndex === strideIndex;
  });
  const revisedStrides = allFrames.filter((f) => {
    return f.sourceIndex === strideIndex + 1;
  });
  // Preserve explicitly accepted directions byte-for-byte, including their
  // original normalization; a revised sheet must not rescale those cells.
  const approved = config.approved;
  const strides = [
    ...originalStrides.filter((f) => {
      return approved.includes(f.col);
    }),
    ...revisedStrides.filter((f) => {
      return !approved.includes(f.col);
    }),
  ];
  const strideScale = Math.min(
    58 /
      Math.max(
        ...originalStrides.map((f) => {
          return f.width;
        }),
      ),
    (baseHeight * scale) /
      Math.max(
        ...originalStrides.map((f) => {
          return f.height;
        }),
      ),
  );
  const repairScale = Math.min(
    58 /
      Math.max(
        ...revisedStrides.map((f) => {
          return f.width;
        }),
      ),
    (baseHeight * scale) /
      Math.max(
        ...revisedStrides.map((f) => {
          return f.height;
        }),
      ),
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

  return { output, frames, scale, strides, strideScale, repairScale, walkRows, name };
}
