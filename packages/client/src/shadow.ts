// Existing local-light projection caps stretch before near-equal light/caster heights create enormous silhouettes.
export const SHADOW = {
  maximumRadiusRatio: 0.8,
  minimumHeightGap: 20,
  maximumOpacity: 0.65,
  contactAlpha: 32,
  rgbaChannels: 4,
  alphaChannel: 3,
  defaultFrameSize: 16,
} as const;
