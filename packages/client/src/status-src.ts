import type { DebuffKind } from '@emberfall/common';
import { clientAsset } from './urls.ts';

// URL helpers must not initialize the renderer's image atlases.

export const statusSrc = (kind: DebuffKind) => {
  return clientAsset(`/assets/wardrobe-style/${kind}.png`);
};
