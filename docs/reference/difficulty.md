# Emberfall difficulty modifiers and combat factors

[Documentation map](../README.md). Authoritative rules: [combat](../specs/combat.md), [dimensions](../specs/scenes/forest.md#scene-07--dimensions), and [item rarity](../specs/item-rolls.md#item-01--rolled-gear).

Emberfall difficulty comes from four independent factors: dimension, selected difficulty, enemy type, and the number of players inside the run. Multiply the relevant factors together; they do not add.

Reference snapshot: 1 November 2026, including Swamp and Desert. Multipliers apply to each enemy’s own base stats, so they are not a single overall difficulty rating.

![Concept preview: dimension enemy and rarity factors](../images/dimensions.svg)

This diagram illustrates the rules; it is not a gameplay capture.

## What changes each stat

| Factor                 | Enemy health                                | Enemy damage           | Movement                                | Attack timing and range                                                | Rewards                                                            |
| ---------------------- | ------------------------------------------- | ---------------------- | --------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Dimension              | Forest 1×; Swamp 1.2×; Desert 1.4×          | Same dimension factor  | Same factor, including projectile speed | Attack speed, targeting range and area radius use the dimension factor | Rarity: Forest 1×; Swamp 1.3×; Desert 1.6×                         |
| Difficulty             | Easy 1×; Medium 2×; Hard 4×                 | Same difficulty factor | Easy 1×; Medium 1.05×; Hard 1.15×       | No additional attack speed or range modifier                           | Rarity: Easy 1×; Medium 1.5×; Hard 2×                              |
| Enemy type             | Normal 1×; Elite 3×; Boss 10×               | Same type factor       | No type multiplier                      | Uses the archetype’s own attack                                        | Changes the equipment drop gate and item count                     |
| Players inside the run | 1.75 to the power of each additional member | No party multiplier    | No party multiplier                     | No party multiplier                                                    | Dropped XP increases by 1.2 to the power of each additional member |

Attack-speed scaling divides both windup and cooldown by the dimension factor. A 1,200 ms windup becomes 1,000 ms in Swamp and about 857 ms in Desert. A 1.2× radius covers 1.44× the circular area; a 1.4× radius covers 1.96× the area.

Sources: [dimension definitions](../../packages/core/src/mods/dimensions/definitions.ts), [difficulty and enemy-type factors](../../packages/core/src/mods/base.mod.ts), [movement](../../packages/core/src/enemies.ts), [attack timing and radius](../../packages/core/src/simulation/enemy-combat.ts).

## All dimension and difficulty combinations

These are solo Normal-enemy factors before armor, roots or other temporary effects. HP and damage still need the enemy-type factor; HP also needs the party factor.

| Dimension | Difficulty | HP and damage | Move speed | Attack speed | Range and radius | Loot rarity |
| --------- | ---------- | ------------- | ---------- | ------------ | ---------------- | ----------- |
| Forest    | Easy       | 1×            | 1×         | 1×           | 1×               | 1×          |
| Forest    | Medium     | 2×            | 1.05×      | 1×           | 1×               | 1.5×        |
| Forest    | Hard       | 4×            | 1.15×      | 1×           | 1×               | 2×          |
| Swamp     | Easy       | 1.2×          | 1.2×       | 1.2×         | 1.2×             | 1.3×        |
| Swamp     | Medium     | 2.4×          | 1.26×      | 1.2×         | 1.2×             | 1.95×       |
| Swamp     | Hard       | 4.8×          | 1.38×      | 1.2×         | 1.2×             | 2.6×        |
| Desert    | Easy       | 1.4×          | 1.4×       | 1.4×         | 1.4×             | 1.6×        |
| Desert    | Medium     | 2.8×          | 1.47×      | 1.4×         | 1.4×             | 2.4×        |
| Desert    | Hard       | 5.6×          | 1.61×      | 1.4×         | 1.4×             | 3.2×        |

For example, Desert Hard gives 5.6× base HP and damage, 1.61× movement speed, 1.4× attack speed and radius, and 3.2× higher-quality rarity probabilities. It does not give 3.2× as many equipment drops.

Source: [difficulty rarity factors](../../packages/core/src/configs/difficultyRarityMultiplier.ts), combined with the definitions above and the [authoritative loot path](../../packages/core/src/combat/damage.ts).

## Party size

| Players inside the run | Enemy HP factor | XP per dropped shard before gear bonuses |
| ---------------------- | --------------- | ---------------------------------------- |
| 1                      | 1×              | 1                                        |
| 2                      | 1.75×           | 1.2                                      |
| 3                      | 3.0625×         | 1.44                                     |
| 4                      | 5.3594×         | 1.728                                    |
| 8                      | 50.2651×        | 3.5832                                   |

Values are rounded to four decimal places. Count scene members, including dead members and members retained during reconnection. Village players and Bear do not count. Membership changes resize existing and pending enemies while preserving their health percentage.

A shard’s XP amount is fixed at death. Collection grants that amount to each eligible living scene player; it is not divided between players. The credited killer also receives the separate base 1 XP kill reward. Equipment XP bonuses can create extra shards.

Sources: [membership scaling](../../packages/core/src/simulation/forest-lifecycle.ts), [XP generation](../../packages/core/src/combat/damage.ts), [collection](../../packages/core/src/simulation/pickups.ts).

## How the calculation works

| Quantity                                 | Calculation                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Enemy maximum HP                         | Base HP × enemy type × difficulty HP factor × dimension factor × 1.75^(players inside − 1)                                  |
| Incoming attack damage before mitigation | Base damage × enemy type × difficulty damage factor × dimension factor                                                      |
| Movement speed                           | Base speed × difficulty movement factor × dimension factor; eligible rooted non-boss enemies then move at 90% of that speed |
| Windup and successful-attack cooldown    | Base duration ÷ dimension factor                                                                                            |
| Targeting range and ability radius       | Base range or radius × dimension factor                                                                                     |
| Enemy projectile speed                   | 210 world units/second × dimension factor; lifetime stays 2.5 seconds                                                       |
| Equipment rarity factor                  | Dimension rarity factor × difficulty rarity factor; the shared Forest scene-family factor is currently 1×                   |

With no scene members, the party exponent is clamped to zero. Actual incoming damage also depends on the player’s armor and defensive talents; ordinary positive hits have a minimum of 1 damage after mitigation. Bosses do not receive the roots slow.

Sources: [base attributes](../../packages/core/src/utils/enemyAttributes.ts), [spawning](../../packages/core/src/simulation/spawns.ts), [combat and mitigation](../../packages/core/src/simulation/enemy-combat.ts), [shared enemy rules](../../packages/core/src/mods/base/entities/enemies.ts).

## Worked example

**The Mire Matriarch in Swamp Hard with three scene members** uses Moss Golem base stats: 30 HP, 8 damage, 36 movement speed and an 85-unit stomp radius.

| Result                          | Calculation                                      | Value                                        |
| ------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| Maximum HP                      | 30 × Boss 10 × Hard 4 × Swamp 1.2 × party 3.0625 | 4,410 HP                                     |
| Damage before player mitigation | 8 × 10 × 4 × 1.2                                 | 384                                          |
| Movement speed                  | 36 × Hard movement 1.15 × Swamp 1.2              | 49.68 units/second                           |
| Stomp radius                    | 85 × 1.2                                         | 102 units                                    |
| Windup                          | 1,200 ÷ 1.2                                      | 1,000 ms                                     |
| Successful-attack cooldown      | 1,800 ÷ 1.2                                      | 1,500 ms                                     |
| Equipment rarity factor         | Swamp 1.3 × Hard 2                               | 2.6×                                         |
| XP per base dropped shard       | 1.2²                                             | 1.44 XP to each eligible living scene player |

Sources: [Moss Golem stats](../../packages/core/src/mods/dimensions/enemies.ts), [boss archetype selection](../../packages/core/src/mods/dimensions.mod.ts).

## Loot quality and drop quantity

Rarity factors multiply the probability intervals for Legendary, Epic, Rare and Uncommon gear. Common receives the remaining probability. Merchant-generated gear retains the base odds, and existing items are not rerolled.

| Rarity    | Base odds | Swamp Hard 2.6× | Desert Hard 3.2× |
| --------- | --------- | --------------- | ---------------- |
| Legendary | 0.01%     | 0.026%          | 0.032%           |
| Epic      | 0.1%      | 0.26%           | 0.32%            |
| Rare      | 1%        | 2.6%            | 3.2%             |
| Uncommon  | 10%       | 26%             | 32%              |
| Common    | 88.89%    | 71.114%         | 64.448%          |

Enemy type controls a separate equipment gate and count roll:

| Enemy type | Equipment gate | Count after the gate succeeds                                       |
| ---------- | -------------- | ------------------------------------------------------------------- |
| Normal     | 4%             | 1% chance of one item, otherwise zero                               |
| Elite      | 15%            | Roll an integer from 50% to 150%, then convert it to an item count  |
| Boss       | 50%            | Roll an integer from 100% to 500%, then convert it to an item count |

Each full 100% guarantees one item; the remainder rolls for another. For example, 350% means three guaranteed items plus a 50% chance of a fourth. The gate passing does not always guarantee an item. Dimension and difficulty rarity factors change quality, not these gate/count rules, gold or base XP.

Sources: [rarity roll](../../packages/core/src/item-stats.ts), [base rarity probabilities](../../packages/core/src/configs/rarityDropChance.ts), [drop gates and counts](../../packages/core/src/mods/base.mod.ts), [count conversion](../../packages/core/src/utils/itemDropCount.ts).

## Other things that affect combat difficulty

| Factor                                      | Practical effect                                                                                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enemy archetype and abilities               | Enemies have different base HP, damage, speed, reach and timing. Swamp adds marked lunges, spore bursts and stomps. Desert adds quick bites, three-shot fans and eight-shot sunbursts.                                           |
| Spawn mix                                   | Forest uses its existing brute/caster chance rules and runner/skeleton fallback. Swamp and Desert each use their own three-enemy pool with equal registered spawn chances; non-boss spawns also roll a 5% elite chance.          |
| Encounter pressure                          | Regular spawn attempts occur every 400 ms, subject to placement and the 160-enemy scene cap. After 120 seconds the boss is requested; regular spawning continues until the boss dies. Every spawn has a base one-second warning. |
| Player equipment, talents, tactics and Bear | These change damage output, mitigation, mobility, crowd control and survival. Player level is not an input to the enemy-scaling formulas above.                                                                                  |
| Positioning and scenery                     | Marked ground attacks can be dodged; projectile paths and wrapped geometry matter. Enemies and Bear steer around trunks, and enemy shots collide with trees. Players move through scenery.                                       |
| Rain, fog, drifting sand and lighting       | Presentation and visibility effects; they do not add a weather stat multiplier or deal weather damage.                                                                                                                           |
| Body size and shared hit immunity           | Dimension factors do not enlarge enemy body/collision size. The shared incoming-hit cooldown remains one second.                                                                                                                 |
| An empty or fully dead scene                | Combat and encounter timers pause when no living scene player remains. Rejoining resumes remaining deadlines.                                                                                                                    |
| Training                                    | Uses shared combat rules but gives no XP or loot.                                                                                                                                                                                |

Sources: [dimension enemy definitions](../../packages/core/src/mods/dimensions/enemies.ts), [spawn policy](../../packages/core/src/mods/dimensions.mod.ts), [encounter cadence](../../packages/core/src/mods/base/encounters/forest.ts), [scene lifecycle](../../packages/core/src/simulation/forest-lifecycle.ts), [weather renderer](../../packages/client/src/dimension-weather.ts).
