import { MILLISECONDS_PER_SECOND } from '@emberfall/common';

// Smoothstep uses the cubic 3t²-2t³ to join keyframes with zero slope at both endpoints.
const SMOOTHSTEP_CUBIC = 3;

// A one-hour presentation cycle retains the existing 6/30/6/18-minute dawn/day/dusk/night split.
const DAY_CYCLE = {
  minutesPerHour: 60,
  secondsPerMinute: 60,
  daylightEnd: 0.7,
  nightFraction: 0.3,
  lightReduction: 0.7,
  shadowLength: 1.8,
  elevationShortening: 1.35,
  shadowAspect: 0.6,
  sunOpacity: 0.26,
  moonOpacity: 0.12,
  horizonFade: 5,
} as const;
// RGB channels use eight bits; packing shifts preserve the renderer's 0xRRGGBB color format.
const RGB = { maximum: 255, redShift: 16, greenShift: 8, greenIndex: 2, blueIndex: 3 } as const;

export const DAY_MS =
  DAY_CYCLE.minutesPerHour * DAY_CYCLE.secondsPerMinute * MILLISECONDS_PER_SECOND;

// Dawn 6m, daylight 30m, dusk 6m, night 18m. Endpoints join seamlessly.
const KEYS = [
  [0, 0.48, 0.58, 0.82, 0],
  [0.05, 1, 0.82, 0.68, 0.5],
  [0.1, 1, 1, 1, 1],
  [0.6, 1, 1, 1, 1],
  [0.65, 1, 0.72, 0.62, 0.5],
  [0.7, 0.48, 0.58, 0.82, 0],
  [1, 0.48, 0.58, 0.82, 0],
] as const;

export function dayNight(serverTime: number) {
  const phase = (((serverTime % DAY_MS) + DAY_MS) % DAY_MS) / DAY_MS;
  const index = KEYS.findIndex((key) => {
    return key[0] > phase;
  });
  const from = KEYS[index - 1],
    to = KEYS[index];
  const progress = (phase - from[0]) / (to[0] - from[0]);
  const blend = progress * progress * (SMOOTHSTEP_CUBIC - 2 * progress);
  const channel = (i: 1 | 2 | 3) => {
    return Math.round(RGB.maximum * (from[i] + (to[i] - from[i]) * blend));
  };

  const daylight = from[4] + (to[4] - from[4]) * blend;
  const sun = phase < DAY_CYCLE.daylightEnd;
  const orbit =
    (sun
      ? phase / DAY_CYCLE.daylightEnd
      : (phase - DAY_CYCLE.daylightEnd) / DAY_CYCLE.nightFraction) * Math.PI;
  const elevation = Math.sin(orbit);
  const length = DAY_CYCLE.shadowLength - elevation * DAY_CYCLE.elevationShortening;

  return {
    tint:
      (channel(1) << RGB.redShift) |
      (channel(RGB.greenIndex) << RGB.greenShift) |
      channel(RGB.blueIndex),
    daylight,
    lightAlpha: 1 - daylight * DAY_CYCLE.lightReduction,
    celestial: sun ? 'sun' : 'moon',
    // Both bodies travel east to west; their shadows fade at the horizon handoff.
    shadow: {
      x: Math.cos(orbit) * length,
      y: length * DAY_CYCLE.shadowAspect,
      opacity:
        (sun ? DAY_CYCLE.sunOpacity : DAY_CYCLE.moonOpacity) *
        Math.min(1, elevation * DAY_CYCLE.horizonFade),
    },
  };
}
