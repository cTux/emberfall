export const DAY_MS = 60 * 60 * 1000;

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
  const blend = progress * progress * (3 - 2 * progress);
  const channel = (i: 1 | 2 | 3) => {
    return Math.round(255 * (from[i] + (to[i] - from[i]) * blend));
  };

  const daylight = from[4] + (to[4] - from[4]) * blend;
  const sun = phase < 0.7;
  const orbit = (sun ? phase / 0.7 : (phase - 0.7) / 0.3) * Math.PI;
  const elevation = Math.sin(orbit);
  const length = 1.8 - elevation * 1.35;

  return {
    tint: (channel(1) << 16) | (channel(2) << 8) | channel(3),
    daylight,
    lightAlpha: 1 - daylight * 0.7,
    celestial: sun ? 'sun' : 'moon',
    // Both bodies travel east to west; their shadows fade at the horizon handoff.
    shadow: {
      x: Math.cos(orbit) * length,
      y: length * 0.6,
      opacity: (sun ? 0.26 : 0.12) * Math.min(1, elevation * 5),
    },
  };
}
