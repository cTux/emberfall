export function packPlayerFrames({ isolated, name, config }) {
  // Match the shipped four-facing, ten-row atlas at twice the logical 64 px cell size.
  const atlasLayout = { width: 512, height: 1280, cell: 64, resolution: 2, baseline: 61 };
  // Preserve approved silhouette margins inside each 64 px logical cell.
  const spriteBounds = { width: 58, height: 56 };
  // Row/column IDs describe the approved source sheets, including repaired fallen/cast poses.
  const sourcePoses = {
    firstExtraRow: 6,
    oldFallen: 8,
    fallen: 9,
    sideFacing: 2,
    safeCast: 6,
    castFollowThrough: 7,
  };
  const { allFrames, images, strideIndex } = isolated;
  let frames = allFrames.filter((f) => {
    return f.sourceIndex === 0;
  });

  if (name === 'warrior') {
    frames = frames
      .filter((f) => {
        return f.row < sourcePoses.firstExtraRow || f.row === sourcePoses.oldFallen;
      })
      .map((f) => {
        return { ...f, row: f.row === sourcePoses.oldFallen ? sourcePoses.fallen : f.row };
      });
    frames.push(
      ...allFrames
        .filter((f) => {
          return f.sourceIndex === 1 && !f.isStride;
        })
        .map((f) => {
          return { ...f, row: f.row + sourcePoses.firstExtraRow };
        }),
    );
  }

  if (name === 'druid') {
    frames.push(
      ...allFrames.filter((f) => {
        return (
          f.sourceIndex === 1 && f.row === sourcePoses.fallen && f.col >= sourcePoses.sideFacing
        );
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
      return f.col === sourcePoses.sideFacing && f.row === sourcePoses.safeCast;
    });
    frames = frames.map((f) => {
      return f.col === sourcePoses.sideFacing &&
        (f.row === sourcePoses.castFollowThrough || f.row === sourcePoses.oldFallen)
        ? { ...safe, row: f.row }
        : f;
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
    spriteBounds.width /
      Math.max(
        ...frames.map((f) => {
          return f.width * f.unitScale;
        }),
      ),
    spriteBounds.height /
      Math.max(
        ...frames.map((f) => {
          return f.height * f.unitScale;
        }),
      ),
  );
  const output = document.createElement('canvas');
  output.width = atlasLayout.width;
  output.height = atlasLayout.height;
  const out = output.getContext('2d');
  out.imageSmoothingEnabled = false;
  out.scale(atlasLayout.resolution, atlasLayout.resolution);
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
      f.col * atlasLayout.cell + Math.floor((atlasLayout.cell - width) / 2),
      rows[f.row] * atlasLayout.cell + atlasLayout.baseline - height,
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
    spriteBounds.width /
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
    spriteBounds.width /
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
    const y = walkRows[f.row] * atlasLayout.cell;
    out.clearRect(f.col * atlasLayout.cell, y, atlasLayout.cell, atlasLayout.cell);
    out.drawImage(
      images[f.sourceIndex],
      f.left,
      f.top,
      f.width,
      f.height,
      f.col * atlasLayout.cell + Math.floor((atlasLayout.cell - width) / 2),
      y + atlasLayout.baseline - height,
      width,
      height,
    );
  }

  return { output, frames, scale, strides, strideScale, repairScale, walkRows, name };
}
