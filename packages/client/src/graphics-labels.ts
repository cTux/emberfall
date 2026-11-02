import type { GraphicsSettings } from './graphics-settings.ts';

export const GRAPHICS_LABELS: Record<
  Exclude<keyof GraphicsSettings, 'resolution' | 'frameLimit'>,
  string
> = {
  smoothTextures: 'Smooth textures',
  adaptiveResolution: 'Adaptive resolution',
  lightShafts: 'Sunlight shafts (2D)',
  colorGrading: 'Cinematic color grading',
  vignette: 'Vignette',
  fog: 'Volumetric fog (2D)',
  ambientOcclusion: 'Ambient occlusion (2D)',
  shadows: 'Soft shadows',
  wavingVegetation: 'Waving trees',
  motionBlur: 'Character motion blur',
  lighting: 'Dynamic lighting',
  bloom: 'Bloom',
  particles: 'Ambient particles',
};
