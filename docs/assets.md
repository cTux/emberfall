# Assets and attribution

Use licensed project assets and preserve their original credits. Asgard’s Fall is visual inspiration; its assets are not copied. The adjacent Ninja Adventure gallery is an import source, not a runtime dependency or an editable part of this repository.

## Sprites and icons

Class weapons use [Kyrise's Free 16x16 RPG Icon Pack v1.3](https://kyrise.itch.io/kyrises-free-16x16-rpg-icon-pack) under CC BY 4.0: steel sword, green wooden bow, red-and-gold mage staff and green druid staff. The four original 16x16 PNGs are unmodified and renamed for their classes. Kyrise is credited in the Codex and `public/assets/weapons/CREDITS.txt`; the original pack readme is included as `KYRISE-README.txt`. [Game-icons.net](https://game-icons.net/) provides bleeding, poison, burning and plant-roots symbols under CC BY 3.0, credited in the Codex and `public/assets/status/CREDITS.txt`. These clear silhouettes remain readable in the compact nameplate row; the weapons retain the game's pixel-art style.

Selected original sprites are copied from the adjacent `ninja-adventure-gallery/src/assets` directory into `packages/client/public/assets`. The original gallery is unchanged. Ninja Adventure by Pixel-boy and AAA is CC0; the original license and credits accompany the copies. [Asset source](https://pixel-boy.itch.io/ninja-adventure-asset-pack).

The wardrobe is a crop from LPC Wooden Furniture, distributed under CC BY-SA 3.0. Consult [LPC credits](../packages/client/public/assets/LPC-CREDITS.txt), [license](../packages/client/public/assets/LPC-LICENSE.txt) and [source notes](../packages/client/public/assets/LPC-README.md) before redistributing or changing it. Class characters, Bear (using the WildBoar sprite), ambient animals and paths come from Ninja Adventure under CC0; exact original paths are recorded in the shipped asset notes.

Path lamps use Karsiori’s FREE Pixel Art Lantern Pack under CC0. Keep the original source filenames, license notes and [lantern credits](../packages/client/public/assets/lanterns/CREDITS.txt).

## Audio and fonts

The six TimberwolfGames tracks and Ninja Adventure sampled effects are CC0. Preserve [audio credits](../packages/client/public/audio/CREDITS.txt) and [CC0 text](../packages/client/public/audio/CC0.txt). Playback rules are in [UI-04](specs/interface-and-audio.md#ui-04--settings-and-music).

All interface and Canvas labels use bundled Alegreya Sans (regular, medium, bold and italic), distributed under the SIL Open Font License in `public/assets/fonts/OFL.txt`. [Font source](https://github.com/google/fonts/tree/main/ofl/alegreyasans).

Fonts are also bundled under client and UI `public/fonts` directories. Preserve the SIL license in every distributed font location.

## Import verification

- Record source, author, license and transformations in the relevant credits.
- Preserve original artwork when importing; use existing runtime composition where appropriate.
- Verify asset URLs in client production and Storybook when shared.
- Check in-game Codex credits as well as shipped credit files.

See [asset notes](../packages/client/public/assets/README.md), [Codex](../packages/client/src/Codex.tsx) and [font tests](../tests/fonts.spec.ts).
