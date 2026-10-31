# Animated wardrobe-style assets

Generated with built-in imagegen on 2026-10-04 from the approved Emberfall concept sheets and the existing wardrobe reference. This directory contains generated source sheets plus mechanically cropped 96px weapon, status and portrait icons. Runtime atlas packaging preserves source artwork, trims transparent margins, maps measured row/column boundaries, and uses nearest-neighbor sampling. Actor rows are idle, four locomotion frames, windup, release, fallen. The four player classes use prepackaged 40-cell atlases with six distinct gait poses per direction; the earlier walk-only sheets remain as source references. Rebuild with `node scripts/package-player-art.mjs`; source rectangles and scale are recorded in each `*-atlas.json`. Runner and caster retain three unique walk poses with one passing pose reused. Idle breathing, hurt flashes and enemy death fades are procedural presentation; locomotion and attacks use painted frames. Animal directions use horizontal reflection. These are a first integrated art pass, not hand-cleaned final animation.

Reference: LPC Wooden Furniture by bluecarrot16, Baŝto, Lanea Zimmerman (Sharm), William Thompson, Tuomo Untinen (Reemax), and Janna/Lilius/Jannax. https://opengameart.org/content/lpc-wooden-furniture . The original wardrobe crop and full source credits are retained under ../LPC-README.md, LPC-CREDITS.txt and LPC-LICENSE.txt. Wardrobe-derived artwork in this collection is distributed under CC BY-SA 3.0 with those notices. Other existing asset licenses remain alongside the original assets.

Preview: run the new client and visit /?art-gallery . The gallery shares the game's actual atlas loader and animation selector. Static buildings and terrain remain static; existing world geometry, lighting, foliage sway, damage and save rules are unchanged. Font and audio assets are unchanged.

## Completed item and scenery artwork

See [item icon provenance](ITEM-ART-README.md) for the sixteen dedicated inventory
and ground-loot icons, [resource states](RESOURCE-STATES-README.md) for distinct
stone and harvested-plant sprites, and [building extensions](BUILDING-EXTENSIONS-README.md)
for the Storehouse and Lodge. Their alpha silhouettes drive the renderer's sun
and local-light shadow masks; the images contain no baked cast shadows.

## Empty bottle

`empty-bottle.png` is the dedicated generated crafting-resource inventory icon.
See [generation and packaging provenance](EMPTY-BOTTLE-README.md).

## Village buildings

See [building provenance and native source crops](BUILDINGS-README.md) for the
three regenerated designs, their exact prompt and aspect-preserving placement.

## Village plants

See [plant provenance and packaging](PLANTS-README.md) for the five generated
lobby plant kinds and their source-cell boundaries.

## Default spell icons

`default-spells.png` is the approved four-icon source sheet generated with OpenAI
imagegen on 2026-10-21 using the existing wardrobe icons as a style reference.
The four 96×96 `{warrior,ranger,mage,druid}-spell.png` assets are mechanical
nearest-neighbor crops of the approved artwork, including its bronze frames.
Source rectangles (x, y, width, height) are warrior (144, 183, 352, 352), ranger
(655, 183, 352, 352), mage (1165, 183, 352, 352), and druid (1676, 183, 352, 352).
The wardrobe uses these spell assets separately from the compact status icons.
The collection’s CC BY-SA 3.0 distribution and retained LPC notices above apply.

Prompt: Rework the four spell icons in the reference’s dark fantasy retro
pixel-art style, with dark forest-green backgrounds and bronze square frames.
Show a silver slash arc with a crimson blood trail and falling drops; three
flying arrows coated in green venom; two flying fireballs with distinct hot
cores and fiery tails; and branching brown roots following a strong zigzag path
with green leaves. Keep silhouettes readable at small inventory size. Arrange
four framed tiles in one horizontal row with padding, without text or weapons.

## Prompt log

- [Health potion generation record](prompts/items.md)
- [Player generation prompts](prompts/players.md)
- [Enemy and animal generation prompts](prompts/enemies.md)
- [Scenery, effects and interface generation prompts](prompts/scenery.md)

## Gathered resources

`gathered.png` was generated with OpenAI imagegen on 2026-10-23 using
`environment.png` as its style reference. Its three equal-width cells contain a
chopped tree stump, depleted stone outcrop and harvested plant. The runtime trims
transparent margins and packs them into 128px cells with nearest-neighbor sampling.
The collection's CC BY-SA 3.0 distribution and retained LPC notices above apply.

Prompt: Create a companion sprite sheet for the environment sheet on a transparent
background, exactly three columns and one row, without text or grid lines. Draw a
freshly chopped oak stump with mossy roots and golden growth rings, a depleted
stone outcrop with scattered gray chips, and harvested short green stems with
fallen leaves. Match the source's crisp dark outlined pixel art, muted olive greens,
warm brown wood and gray stones in a top-down three-quarter RPG view.

<a id="health-potion"></a>

See [topic detail](prompts/items.md#health-potion).

<a id="player-stride-correction"></a>

See [topic detail](prompts/players.md#player-stride-correction).

<a id="warrior"></a>

See [topic detail](prompts/players.md#warrior).

<a id="ranger"></a>

See [topic detail](prompts/players.md#ranger).

<a id="mage"></a>

See [topic detail](prompts/players.md#mage).

<a id="druid"></a>

See [topic detail](prompts/players.md#druid).

<a id="wardrobe"></a>

See [topic detail](prompts/players.md#wardrobe).

<a id="skeleton"></a>

See [topic detail](prompts/enemies.md#skeleton).

<a id="runner"></a>

See [topic detail](prompts/enemies.md#runner).

<a id="brute"></a>

See [topic detail](prompts/enemies.md#brute).

<a id="caster"></a>

See [topic detail](prompts/enemies.md#caster).

<a id="warden"></a>

See [topic detail](prompts/enemies.md#warden).

<a id="animals"></a>

See [topic detail](prompts/enemies.md#animals).

<a id="animals-alpha-repair"></a>

See [topic detail](prompts/enemies.md#animals-alpha-repair).

<a id="environment"></a>

See [topic detail](prompts/scenery.md#environment).

<a id="effects"></a>

See [topic detail](prompts/scenery.md#effects).

<a id="icons"></a>

See [topic detail](prompts/scenery.md#icons).

<a id="terrain"></a>

See [topic detail](prompts/scenery.md#terrain).

<a id="pickups"></a>

See [topic detail](prompts/scenery.md#pickups).

<a id="panel"></a>

See [topic detail](prompts/scenery.md#panel).
