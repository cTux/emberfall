export const RENDER_TUNING = {
  // Retain the existing bounded palette cache; this is a budget, not a measured optimum.
  colorCacheEntries: 512,
  // An eight-bit ramp keeps the existing gradient appearance and texture footprint.
  gradientSize: 256,
  // Prevent zero-length gradients from creating singular texture transforms.
  minimumGradientExtent: 0.0001,
  // Keep gradients for two nominal 60 Hz seconds so short reuse gaps do not rebake them.
  gradientIdleFrames: 120,
  // Keep image textures for ten nominal 60 Hz seconds across brief scene transitions.
  imageIdleFrames: 600,
  // Twelve segments preserve roundness on small ellipses; larger curves add samples below.
  minimumEllipseSegments: 12,
  // Retain the existing four-pixel polygon approximation of rotated ellipses.
  ellipseSegmentPixels: 4,
  // Pool headroom and gradual 25% trimming preserve the existing allocation/retention tradeoff.
  poolHeadroom: 32,
  poolRetention: 0.75,
  // Fourfold text rasterization preserves the current small-font sharpness.
  textResolution: 4,
  // Half-resolution, two-pass blur retains the current shadow quality/cost tradeoff.
  blurQuality: 2,
  blurResolution: 0.5,
  // The existing Canvas adapter maps shadowBlur to half that Pixi blur-filter strength.
  canvasBlurDivisor: 2,
  // Publish diagnostics once per nominal 60 Hz second rather than serializing every frame.
  statsIntervalFrames: 60,
  // Trim every two nominal 60 Hz seconds to amortize cache scanning.
  trimIntervalFrames: 120,
  // Three blur radii plus two pixels retain the existing unclipped Canvas shadow envelope.
  shadowBlurPadding: 3,
  shadowEdgePadding: 2,
  // Bound baked rectangle variants without changing their existing eviction policy.
  shadowCacheEntries: 128,
  // One game pixel keeps the cutout tight while separating foreground art from the player.
  playerCutoutMargin: 1,
  // Ignore very faint antialiasing fringe when constructing the occlusion silhouette.
  minimumCutoutAlpha: 32,
  // Canvas ImageData stores RGBA bytes; alpha is the fourth channel.
  rgbaStride: 4,
  alphaChannel: 3,
  // Preserve the adapter's fallback for Canvas font strings outside its supported grammar.
  fallbackFontSize: 10,
  // Retain the existing visual approximation of a Canvas alphabetic baseline in Pixi.
  alphabeticAnchor: 0.8,
  // Center alignment anchors the text at the midpoint of its measured box.
  centerAnchor: 0.5,
} as const;
