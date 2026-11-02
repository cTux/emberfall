import type { DebuffKind } from '@emberfall/core/contracts';
import { clientAsset } from './urls.ts';

// URL helpers must not initialize the renderer's image atlases.

export const statusSrc = (kind: DebuffKind) => {
  return clientAsset(`/assets/wardrobe-style/${kind}.png`);
};
