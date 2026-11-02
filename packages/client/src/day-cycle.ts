// A one-hour presentation cycle retains the existing 6/30/6/18-minute dawn/day/dusk/night split.
export const DAY_CYCLE = {
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
