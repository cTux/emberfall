import type { nearbyInteraction } from '@emberfall/core';

export type Interaction = NonNullable<ReturnType<typeof nearbyInteraction>> & {
  activate?: () => void;
};

export {
  drawChatBubble,
  drawInteractionPrompt,
  drawCharacterName,
  drawNameBadge,
  drawPlayerHealth,
} from './effects/labels.ts';
export {
  vegetationSway,
  drawVegetation,
  drawParticles,
  drawVignette,
  drawAtmosphere,
} from './effects/world.ts';
export { hitOutline, drawTargetHit, drawDamageFlash, drawPartyOutline } from './effects/hits.ts';
