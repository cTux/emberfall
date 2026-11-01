// Existing game-pixel layout calibration keeps bubbles above sprites and their health/debuff rows.
export const LABEL_STYLE = {
  chat: {
    wrapWidth: 200,
    horizontalPadding: 16,
    lineHeight: 13,
    verticalPadding: 10,
    // The bubble ends two pixels above the existing player health bar.
    bottomOffset: 52,
    shadowBlur: 8,
    shadowOffset: 3,
    cornerRadius: 8,
    firstBaseline: 11.5,
  },
  // These concentric radii retain the existing bronze keycap's one-pixel inset rings.
  interaction: {
    horizontalPadding: 24,
    centerOffset: 23,
    keyOffset: 8,
    capsuleRadius: 8,
    // Three quarter-turns close the left semicircle from bottom to top.
    arcTurns: 1.5,
    outlineWidth: 0.6,
    rimRadius: 6,
    faceRadius: 5,
    faceGradientExtent: 4,
    faceGradientStop: 0.45,
    shadowBlur: 2,
    faceShadowOffset: 1.5,
    faceOutlineWidth: 0.4,
    labelOffset: 18,
  },
  // A two-pixel dark stroke preserves name readability against scenery.
  nameStrokeWidth: 2,
  // Preserve the compact NPC nameplate's current padding and baseline alignment.
  badge: { padding: 12, top: 20, height: 13, baseline: 10 },
  // Minimum widths and baselines match the existing normal/boss name and sprite clearance.
  health: { bossMinimumWidth: 64, minimumWidth: 40, padding: 12, bossBottom: 9, bottom: 7 },
} as const;
