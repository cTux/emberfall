# Characters and saved progress

Status: implemented; CHAR-05 applies to the new runtime. Goal: Preserve character identity and independent class progress. See [current technical design](../design/network-and-persistence.md) and [Steam account design](../design/steam-accounts.md).

## CHAR-01 — Identity and recovery

In the original runtime, a server-generated 256-bit bearer key in browser localStorage identifies the character; only its SHA-256 hash is stored in the database. Nicknames are not credentials. Clearing browser site data loses access to that character; there is no account recovery or cross-device login yet. Duplicate active sessions for the same character are rejected. The browser cannot write levels, XP, or stats. Failed loads do not silently reset characters; failed saves are reported and retried. Forest kills add 1 XP each; playtime also progresses. Dead characters revive on rejoining a village. Every return from a scene (return portal, death window, or leaving early) restores the returning player to maximum health and their companion to maximum health immediately, clearing any pending companion resurrection.

New characters start at level 1 with 0 XP, 100/100 HP and 0 playtime. Level and XP are stored, but level advancement and talent effects are not implemented. Collecting XP currently requires no progression choice. Mana is not a character resource, equipment stat or UI element. Older saves discard obsolete mana fields without resetting other progress.

## CHAR-02 — Class selection

The wardrobe opposite the village portal switches between warrior (default), ranger, mage, and druid, only while in lobby and outside the departure countdown. Existing character saves migrate to warrior; each class keeps independent level, XP, health, playtime, and reserved talent data under the same character identity (the original browser token or new-runtime Steam account). Switching is server-validated by proximity and saved before it becomes visible.

## CHAR-03 — Save lifecycle

New-runtime coins are saved independently per class with the existing progress lifecycle. Older saves start at zero coins without losing other progress. Clients cannot grant or overwrite coins.

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
other gear can add power, cadence, range, health and armor. Characters retain
innate 100 maximum health, plus gear bonuses. Armor starts at
zero and mitigates incoming damage by `armor / (100 + armor)`. Unequipped
characters cannot attack. The server owns equipment and combat results.

The equipment panel shows one Range row for the current targeting mode:
automatic targeting uses automatic range, and manual targeting uses manual range.

Starter weapons retain existing power/range/cadence and have a 5% critical chance
for 150% damage. Warrior damage is physical, Mage fire, Ranger poison and Druid
nature. Each direct hit rolls independently; splash scales from weapon power and
can crit. Ailment ticks and Bear attacks do not inherit weapon critical rolls.

## CHAR-05 — Steam accounts and nickname

Players log in through Steam. After the first successful login, show a nickname
dialog prefilled with their Steam display name. Confirming saves the chosen game
nickname on the server. Returning players who completed this step do not see it
again; an interrupted first setup remains pending on the next login.

Settings has an Account tab with the current game nickname and an action to change
it. That action opens the same nickname dialog, prefilled with the saved game
nickname. Cancelling an edit preserves the previous value; failed saves leave the
dialog open with a retryable error. Subsequent Steam display-name changes do not
overwrite the chosen game nickname.

Steam identity and game nickname are separate: changing the nickname preserves
the account, character, class progress and equipment. Logging into the same Steam
account from another browser recovers its linked character. Nicknames are never
credentials. Existing duplicate-active-character protection remains in force.

Nickname confirmation is required before joining a world. Names are trimmed and
limited to 1–24 UTF-16 code units, without invisible/control characters. Duplicate
names are allowed. Successful renames update live players. Steam names outside
the game limit remain visible as the initial draft with validation feedback,
rather than being silently truncated to the game limit. Profile lookup failure
allows manual entry without treating the Steam login as invalid. Closing first
setup signs out; cancelling a later edit preserves the saved nickname.

Steam accounts start fresh. Existing browser saves are preserved and never linked
or merged automatically. The new executable requires Steam configuration and has
no guest fallback. CHAR-01 describes the unchanged original runtime and the isolated
legacy-protocol test fixtures. Account sessions expire after seven days; signing
out revokes the session and closes its active connection.

Steam acceptance:

- First Steam login opens the dialog with the Steam display name; confirmation
  persists the chosen nickname and marks setup complete atomically.
- Reload during unfinished setup opens the dialog again; completed setup is
  skipped on subsequent logins, including on another device.
- Settings → Account opens the same dialog with the saved nickname. Save updates
  the account; cancel or a failed save does not change it.
- Renaming or changing the Steam profile name never creates a new character or
  resets progress. The saved game nickname survives login and server restart.
- Forged identities, expired sessions and another account's rename requests cannot
  read or mutate the account. Concurrent active character sessions remain rejected.

## Acceptance — original identity and shared character behavior

- Restart with the same character key preserves name and each class’s XP, level, HP, playtime and reserved talent data.
- Older single-class saves load as Warrior; missing classes start fresh without overwriting existing class progress.
- Class selection fails outside wardrobe range, in the forest or during departure countdown.
- Returning by portal, early exit or death restores maximum HP and an existing Bear, cancelling pending resurrection.
- A second live session cannot use the same character key. Missing/corrupt saves surface an error.
- XP collection does not open an upgrade selector or block movement; see [PROG-01](progression.md#prog-01--uninterrupted-progression).

Evidence: [characters.test.ts](../../packages/server/src/characters.test.ts), [classes.test.ts](../../packages/server/src/classes.test.ts), [classes.spec.ts](../../tests/classes.spec.ts).

Steam evidence: [server account tests](../../packages/server-new/src/accounts.test.ts) and
[browser account tests](../../tests-new/accounts.spec.ts).
