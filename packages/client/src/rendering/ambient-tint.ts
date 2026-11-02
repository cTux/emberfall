import { CHANNEL } from './channel.ts';

export function ambientTint(base: number, ambient: number) {
  return (
    (Math.round(
      (((base >> CHANNEL.red) & CHANNEL.mask) * ((ambient >> CHANNEL.red) & CHANNEL.mask)) /
        CHANNEL.mask,
    ) <<
      CHANNEL.red) |
    (Math.round(
      (((base >> CHANNEL.green) & CHANNEL.mask) * ((ambient >> CHANNEL.green) & CHANNEL.mask)) /
        CHANNEL.mask,
    ) <<
      CHANNEL.green) |
    Math.round(((base & CHANNEL.mask) * (ambient & CHANNEL.mask)) / CHANNEL.mask)
  );
}
