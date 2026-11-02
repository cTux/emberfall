import type { GraphicsSettings } from './graphics-settings.ts';
import { GRAPHICS_PRESETS } from './graphics-presets.ts';
import { GRAPHICS_LABELS } from './graphics-labels.ts';

// Offer the existing common monitor refresh rates plus zero for uncapped rendering.
const FRAME_LIMIT_OPTIONS = [0, 30, 60, 120, 144];

// Existing quality choices trade 75% resolution for speed and 150% for sharper art.
const RESOLUTION_OPTIONS = [0.75, 1, 1.5];

export function loadGraphics(): GraphicsSettings {
  const settings = { ...GRAPHICS_PRESETS.High };
  try {
    const value = JSON.parse(localStorage.getItem('emberfall-new.graphics') ?? '{}');

    if (!value || typeof value !== 'object') {
      return settings;
    }

    for (const key of Object.keys(GRAPHICS_LABELS) as (keyof typeof GRAPHICS_LABELS)[]) {
      if (typeof value[key] === 'boolean') {
        settings[key] = value[key];
      }
    }

    if (FRAME_LIMIT_OPTIONS.includes(value.frameLimit)) {
      settings.frameLimit = value.frameLimit;
    }

    if (RESOLUTION_OPTIONS.includes(value.resolution)) {
      settings.resolution = value.resolution;
    }
  } catch {
    /* Use High defaults when storage is unavailable or invalid. */
  }

  return settings;
}
