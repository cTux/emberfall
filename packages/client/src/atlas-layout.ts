// These measured grids describe the shipped source PNGs; changing them changes which pixels form each frame.
export const ATLAS_LAYOUT = {
  environment: [3, 3, 128],
  plants: [5, 1, 64],
  wardrobe: [4, 1, 128],
  innkeeper: [4, 1, 64],
  animals: [4, 6, 64],
  bear: [4, 2, 64],
  effects: [4, 4, 128],
  pickups: [4, 3, 64],
  gathered: [3, 1, 128],
} as const;
