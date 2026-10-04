export interface GraphicsSettings {
  ambientOcclusion: boolean;
  shadows: boolean;
  wavingVegetation: boolean;
  motionBlur: boolean;
  lighting: boolean;
  bloom: boolean;
  particles: boolean;
  fog: boolean;
  vignette: boolean;
  resolution: number;
  adaptiveResolution: boolean;
  lightShafts: boolean;
  colorGrading: boolean;
  frameLimit: number;
}
export const GRAPHICS_PRESETS: Record<"Low" | "Balanced" | "High", GraphicsSettings> = {
  Low: {
    adaptiveResolution: true,
    lightShafts: false,
    colorGrading: false,
    frameLimit: 0,
    vignette: false,
    fog: false,
    ambientOcclusion: false,
    shadows: false,
    wavingVegetation: false,
    motionBlur: false,
    lighting: false,
    bloom: false,
    particles: false,
    resolution: 1,
  },
  Balanced: {
    adaptiveResolution: true,
    lightShafts: false,
    colorGrading: true,
    frameLimit: 0,
    vignette: true,
    fog: false,
    ambientOcclusion: true,
    shadows: true,
    wavingVegetation: true,
    motionBlur: false,
    lighting: true,
    bloom: false,
    particles: true,
    resolution: 1,
  },
  High: {
    adaptiveResolution: false,
    lightShafts: true,
    colorGrading: true,
    frameLimit: 0,
    vignette: true,
    fog: false,
    ambientOcclusion: true,
    shadows: true,
    wavingVegetation: true,
    motionBlur: true,
    lighting: true,
    bloom: true,
    particles: true,
    resolution: 1.5,
  },
};
export const GRAPHICS_LABELS: Record<
  Exclude<keyof GraphicsSettings, "resolution" | "frameLimit">,
  string
> = {
  adaptiveResolution: "Adaptive resolution",
  lightShafts: "Sunlight shafts (2D)",
  colorGrading: "Cinematic color grading",
  vignette: "Vignette",
  fog: "Volumetric fog (2D)",
  ambientOcclusion: "Ambient occlusion (2D)",
  shadows: "Soft shadows",
  wavingVegetation: "Waving trees",
  motionBlur: "Character motion blur",
  lighting: "Dynamic lighting",
  bloom: "Bloom",
  particles: "Ambient particles",
};
export function loadGraphics(): GraphicsSettings {
  const settings = { ...GRAPHICS_PRESETS.High };
  try {
    const value = JSON.parse(localStorage.getItem("emberfall-new.graphics") ?? "{}");
    if (!value || typeof value !== "object") return settings;
    for (const key of Object.keys(GRAPHICS_LABELS) as (keyof typeof GRAPHICS_LABELS)[])
      if (typeof value[key] === "boolean") settings[key] = value[key];
    if ([0, 30, 60, 120, 144].includes(value.frameLimit)) settings.frameLimit = value.frameLimit;
    if ([0.75, 1, 1.5].includes(value.resolution)) settings.resolution = value.resolution;
  } catch {
    /* Use High defaults when storage is unavailable or invalid. */
  }
  return settings;
}
