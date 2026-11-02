import { clientAsset } from './urls.ts';

export const artUrl = (name: string) => {
  return clientAsset(`/assets/wardrobe-style/${name}.png`);
};
