import { PORTAL_ART } from './portal-art-layout.ts';
import { portalMask } from './portal-mask.ts';
import type { Interaction } from './effects';
import type { InteractionTarget } from './interaction-targets';
import { portalArt } from './ambient-art';
import { spriteMask } from './lighting';
import { INTERACTION_RADIUS } from '@emberfall/core';

export function portalInteraction(source: Interaction, x: number, y: number): InteractionTarget {
  const stone = !!portalArt.naturalWidth;

  return {
    source,
    x: x - (stone ? PORTAL_ART.stoneOffsetX : PORTAL_ART.fallbackOffsetX),
    y: y - (stone ? PORTAL_ART.stoneOffsetY : PORTAL_ART.fallbackOffsetY),
    width: stone ? PORTAL_ART.stoneWidth : PORTAL_ART.fallbackWidth,
    height: stone ? PORTAL_ART.stoneHeight : PORTAL_ART.fallbackHeight,
    mask: stone
      ? spriteMask(portalArt, 0, 0, false, PORTAL_ART.atlasCell, false, PORTAL_ART.atlasCell)!
      : portalMask,
    reach: source,
    radius: INTERACTION_RADIUS,
  };
}
