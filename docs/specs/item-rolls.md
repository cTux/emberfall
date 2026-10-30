# Item rarity and random stats

## ITEM-01 — Rolled gear

New dropped gear and merchant-generated gear receive one server-owned rarity roll:
Legendary 0.01%, Epic 0.1%, Rare 1%, Uncommon 10%, Common the remaining 88.89%.
Existing item drop gates/counts remain independent. All four weapons join the loot
pool using their existing definitions and dedicated artwork. Resources and consumables
are Common and do not roll gear stats. Existing items retain their intrinsic stats,
default to Common, and never receive retroactive rolls.

Common/Uncommon/Rare/Epic/Legendary gear has 1/1/2/2/3 distinct random stats, in
addition to its intrinsic stats. Sample without replacement: regular weight 1,
eligible legendary-only stat weight 0.2. No extra value variance or rounding.
The rarity multipliers are 1/1.2/1.4/1.7/2. Special stats never scale.

| Stat               | Base | Units                              |
| ------------------ | ---: | ---------------------------------- |
| Attack speed       |    2 | percent                            |
| Critical chance    |    2 | percentage points                  |
| Critical damage    |   10 | percentage points of normal damage |
| Power              |    1 | flat                               |
| Armor              |    1 | flat                               |
| Maximum health     |    5 | flat                               |
| Gold increase      |   10 | additional-drop chance percent     |
| Exp increase       |   20 | additional-drop chance percent     |
| Movement speed     |    3 | percent                            |
| More projectiles   |    1 | fixed additional projectile        |
| Projectiles bounce |    1 | fixed additional bounce            |
| Projectile pierce  |    1 | fixed additional penetration       |
| Additional attack  |    1 | fixed additional attack            |
| Area of effect     |   10 | percent radius/reach               |
| Range              |   10 | percent targeting/travel range     |

Gold Increase and Exp Increase are eligible on every gear type, alongside:

| Type                       | Other regular stats                                         | Legendary-only stat |
| -------------------------- | ----------------------------------------------------------- | ------------------- |
| Sword                      | Power, attack speed, critical chance/damage, area, range    | Additional attack   |
| Bow                        | Power, attack speed, critical chance/damage, range          | Projectile pierce   |
| Fire staff, mage orb       | Power, attack speed, critical chance/damage, area, range    | More projectiles    |
| Nature staff, nature focus | Power, attack speed, critical chance/damage, area, range    | Projectiles bounce  |
| Shield                     | Armor, maximum health, power, attack speed, area            | Additional attack   |
| Quiver                     | Power, attack speed, critical chance/damage, range          | Projectile pierce   |
| Gloves                     | Armor, maximum health, power, attack speed, critical chance | —                   |
| Helmet                     | Armor, maximum health, critical chance/damage, range        | —                   |
| Body armor                 | Armor, maximum health                                       | —                   |
| Leggings                   | Armor, maximum health, movement speed                       | —                   |
| Boots                      | Armor, maximum health, movement speed, range                | —                   |
| Amulet                     | Power, maximum health, critical damage, area                | —                   |
| Ring                       | Power, armor, attack speed, critical chance/damage          | —                   |

## ITEM-02 — Equipped effects and drops

Equipped bonuses sum across slots, including weapon and off-hand. Percent bonuses
sum before multiplication. Critical chance caps at 100%. Hunter retains the saved
class ID `ranger`; each base arrow penetrates three targets after its first hit
(four hits total), plus equipped pierce. Mage projectile count and Druid bounce
count add their respective bonuses. Warrior extra attacks deal full damage and
roll critical and on-hit effects independently. Compatible offensive talents
receive the same extra attacks/projectiles/target penetrations/bounces; area,
range, power, critical and attack speed also affect compatible talent effects.
Training uses the same rules and grants no rewards.

For each kill, sum Gold/Exp Increase across the killer's whole party, counting
each member once, without requiring damage credit. The server evaluates this
once at drop generation. Each full 100% guarantees an extra copy of the original
gold/XP drop; the remainder rolls for another. Gold bonus rolls require the
original gold drop gate to succeed. Copies never generate further copies.
The original killer XP credit and pickup distribution remain unchanged.

## ITEM-03 — Identity, compatibility and presentation

Rolls survive pickup, equip/replacement, unequip, all storage transfers, sale,
buyback, class switching, reconnect and server restart. Invalid stat names,
values, rarity/type combinations and incompatible equipped instances are rejected
at save boundaries. Clients cannot choose rolls or reward bonuses.

Every item slot uses its rarity border, including equipment, backpack, Storehouse,
merchant and buyback. Item drop beams share the same color: Common white
`#ffffff`, Uncommon green `#1eff00`, Rare blue `#0070dd`, Epic purple `#a335ee`,
Legendary orange `#ff8000`. Tooltips identify rarity and every rolled stat.

![Concept preview of rarity borders and beams, not a gameplay capture](../images/item-rarities.svg)

Verification: [rule and persistence checks](../../packages/server/src/item-rolls.test.ts)
and [desktop inventory/storage/trading checks](../../tests/item-rarities.spec.ts).
