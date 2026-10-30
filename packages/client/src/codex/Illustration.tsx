import { clientAsset } from '../urls.ts';

export function Illustration({ image, caption }: { image: string; caption: string }) {
  return (
    <figure>
      <img src={clientAsset(`/assets/wardrobe-style/${image}.png`)} alt={caption} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
