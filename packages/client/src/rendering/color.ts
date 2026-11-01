// RGB uses three eight-bit channels; these offsets/masks are the packed-color format.
const CHANNEL = { red: 16, green: 8, mask: 255, white: 0xffffff } as const;
export const WHITE_TINT = CHANNEL.white;

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
