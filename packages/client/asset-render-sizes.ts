// Native building crops/chimneys are authored in these source coordinates, even after build resizing.
export const BUILDING_SOURCE_SIZES = {
  buildings: { width: 2172, height: 724 },
  'building-storehouse': { width: 768, height: 656 },
  'building-lodge': { width: 762, height: 768 },
} as const;

// Bounds retain the existing atlas backing resolution, not the smaller on-screen actor footprint.
// Aspect ratios and all frames are preserved; already smaller art is never enlarged.
export const IMAGE_RENDER_BOUNDS: Readonly<Record<string, readonly [number, number]>> = {
  // Three seamless 320px tiles retain overlap samples; source sheets include transparent sprite gutters.
  'dimensions/swamp-terrain.png': [1080, 360],
  'dimensions/desert-terrain.png': [1080, 360],
  'dimensions/swamp-scenery.png': [1080, 720],
  'dimensions/desert-scenery.png': [1080, 720],
  'dimensions/swamp-boss.png': [192, 960],
  'dimensions/desert-boss.png': [192, 960],
  'dimensions/swamp-enemies.png': [576, 960],
  'dimensions/desert-enemies.png': [576, 960],
  'dimensions/swamp-items.png': [384, 128],
  'dimensions/desert-items.png': [384, 128],
  // Three 320px ground variants need 359px each for the overlapping seam crossfade.
  'wardrobe-style/terrain.png': [1080, 360],
  // Allow for transparent gutters: loadArt trims visible frames before filling 2x scenery/actor cells.
  'wardrobe-style/environment.png': [1080, 1080],
  'wardrobe-style/plants.png': [640, 214],
  'wardrobe-style/wardrobe.png': [1152, 384],
  'wardrobe-style/animals.png': [512, 768],
  'wardrobe-style/bear-cub.png': [576, 288],
  'wardrobe-style/skeleton.png': [512, 1024],
  'wardrobe-style/runner.png': [576, 1152],
  'wardrobe-style/brute.png': [512, 1024],
  'wardrobe-style/caster.png': [512, 1024],
  'wardrobe-style/portal-stone.png': [336, 336],
  // These non-actor atlases are packed into 128px effects/resources and 64px pickup cells.
  'wardrobe-style/effects.png': [576, 576],
  'wardrobe-style/pickups.png': [336, 252],
  'wardrobe-style/gathered.png': [456, 152],
  // Buildings render at 128px (96px for the lodge); round up beyond 2x to keep exact source aspect ratios.
  'wardrobe-style/buildings.png': [873, 291],
  'wardrobe-style/building-storehouse.png': [288, 246],
  'wardrobe-style/building-lodge.png': [254, 256],
  // Uneven talent cells remain at least 2x the 52px action-picker icons; CSS uses normalized crops.
  'talents/warrior-icons.png': [600, 720],
  'talents/ranger-icons.png': [600, 720],
  'talents/mage-icons.png': [600, 720],
  'talents/druid-icons.png': [600, 720],
  'action-bar/clear.png': [104, 104],
};
