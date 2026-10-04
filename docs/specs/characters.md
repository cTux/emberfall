# Characters and saved progress

Status: implemented baseline. Goal: Preserve each browser-owned character and independent class progress. See [technical design](../design/network-and-persistence.md).

## CHAR-01 — Identity and recovery

A server-generated 256-bit bearer key in browser localStorage identifies the character; only its SHA-256 hash is stored in the database. Nicknames are not credentials. Clearing browser site data loses access to that character; there is no account recovery or cross-device login yet. Duplicate active sessions for the same character are rejected. The browser cannot write levels, XP, or stats. Failed loads do not silently reset characters; failed saves are reported and retried. Forest kills add 1 XP each; playtime also progresses. Dead characters revive on rejoining a village. Every return from a scene (return portal, death window, or leaving early) restores the returning player to maximum health and mana and their companion to maximum health immediately, clearing any pending companion resurrection. Bear has no mana stat.

New characters start at level 1 with 0 XP, 100/100 HP, 50/50 MP and 0 playtime. Level and XP are stored, but level advancement and talent effects are not implemented. Collecting XP currently requires no progression choice.

## CHAR-02 — Class selection

The wardrobe opposite the village portal switches between warrior (default), ranger, mage, and druid, only while in lobby and outside the departure countdown. Existing character saves migrate to warrior; each class keeps independent level, XP, health, mana, playtime, and reserved talent data under the existing browser token. Switching is server-validated by proximity and saved before it becomes visible.

## CHAR-03 — Save lifecycle

Save on entry, every five seconds, on explicit leave, on disconnect and during graceful shutdown. An abrupt exit can lose up to five seconds of progress. Failed loads report an error instead of silently creating a replacement; failed saves are reported and retried. Live positions, scenes, chat, attacks and Bear state are temporary. Class changes save successfully before becoming visible. See [operations](../operations.md) for database configuration and backups.

## CHAR-04 — Equipment (new runtime)

Each class starts with exactly one equipped item: its sword, bow, fire staff or
nature staff. Equipment is saved independently per class. Older saves without
equipment receive that class's starter weapon; explicitly empty slots stay empty.
The nine slots are weapon, gloves, helmet, body armor, leggings, boots, amulet,
off-hand and ring. Off-hands accept class-appropriate shields, quivers, orbs and
nature focuses. This feature provides inspection and starter equipment; acquiring
or manually changing items is outside its scope.

All equipped items contribute to one shared stat calculation. Weapons supply
power, attacks per second, automatic/manual range, damage type and critical stats;
other gear can add power, cadence, range, health, mana and armor. Characters retain
innate 100 maximum health and 50 maximum mana, plus gear bonuses. Armor starts at
zero and mitigates incoming damage by `armor / (100 + armor)`. Unequipped
characters cannot attack. The server owns equipment and combat results.

Starter weapons retain existing power/range/cadence and have a 5% critical chance
for 150% damage. Warrior damage is physical, Mage fire, Ranger poison and Druid
nature. Each direct hit rolls independently; splash scales from weapon power and
can crit. Ailment ticks and Bear attacks do not inherit weapon critical rolls.

## Acceptance

- Restart with the same character key preserves name and each class’s XP, level, HP/MP, playtime and reserved talent data.
- Older single-class saves load as Warrior; missing classes start fresh without overwriting existing class progress.
- Class selection fails outside wardrobe range, in the forest or during departure countdown.
- Returning by portal, early exit or death restores maximum HP/MP and an existing Bear, cancelling pending resurrection.
- A second live session cannot use the same character key. Missing/corrupt saves surface an error.
- XP collection does not open an upgrade selector or block movement; see [PROG-01](progression.md#prog-01--uninterrupted-progression).

Evidence: [characters.test.ts](../../packages/server/src/characters.test.ts), [classes.test.ts](../../packages/server/src/classes.test.ts), [classes.spec.ts](../../tests/classes.spec.ts).
