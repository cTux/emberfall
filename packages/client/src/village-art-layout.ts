// These cell sizes and column counts are fixed by the shipped environment, plant and workstation sheets.
export const VILLAGE_ATLAS = {
  environmentCell: 128,
  plantCell: 64,
  workstationColumns: 4,
  workstationRows: 2,
  workstationSize: 48,
  treeOffsetY: 8,
  torchSourceY: 256,
  torchWidth: 42,
  torchHeight: 64,
  wardrobeWidth: 60,
  wardrobeHeight: 64,
};
// The lodge's smoke anchor is authored inside its replacement image rather than the original building atlas.
export const LODGE_CHIMNEY = { x: 585, y: 18 };
// Match the training dummy's existing 128-pixel atlas cell, 48-unit sprite and status placement.
export const TRAINING_TARGET_ART = {
  column: 1,
  row: 2,
  cell: 128,
  width: 48,
  height: 48,
  left: 24,
  top: 30,
  barLeft: 20,
  barTop: 41,
  barWidth: 40,
  debuffsTop: 52,
};
// Four source frames open the wardrobe in 100 ms steps, ending on frame three.
export const WARDROBE_ANIMATION = { lastFrame: 3, frameMs: 100, cell: 128 };
