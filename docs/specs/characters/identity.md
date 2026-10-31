# Character identity, saves and Steam accounts

[Back to Characters and saved progress](../characters.md).

## CHAR-01 — Identity and recovery

Production identity belongs to a Steam account with a server-owned nickname; see CHAR-05. Legacy bearer keys remain supported only by offline imports and isolated protocol fixtures. Duplicate active sessions for the same character are rejected. The browser cannot write levels, XP, or stats. Failed loads do not silently reset characters; failed saves are reported and retried. Forest kills add 1 XP each; playtime also progresses. Dead characters revive on rejoining a village. Every return from a scene (return portal, death window, or leaving early) restores the returning player to maximum health and their companion to maximum health immediately, clearing any pending companion resurrection.

New characters start at level 1, paragon 0, with 0 XP, 100/100 HP and 0 playtime. XP automatically advances levels up to 20, then paragon, using [PROG-02](../progression.md#prog-02--automatic-levels-and-paragon). Level, paragon and remaining XP persist independently per class; talent ranks and effects follow [PROG-03](../progression.md#prog-03--talents). Collecting XP requires no progression choice. Mana is not a character resource, equipment stat or UI element. Older saves discard obsolete mana fields without resetting other progress.

## CHAR-03 — Save lifecycle

Gold belongs to the account Storehouse, shared by every class. Collected gold goes
directly into that balance; trading spends or credits the same balance. Clients
cannot grant or overwrite gold. The existing save lifecycle applies.

Save on entry, every five seconds, on explicit leave, on disconnect and during graceful shutdown. An abrupt exit can lose up to five seconds of progress. Failed loads report an error instead of silently creating a replacement; failed saves are reported and retried. Live positions, scenes, chat, attacks and Bear state are temporary. Class changes save successfully before becoming visible. See [operations](../../operations.md) for database configuration and backups.

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

Nickname confirmation is required before joining a world. Names must contain 3–12 ASCII letters, digits or underscores, without spaces. Duplicate
names are allowed; party commands reject ambiguous matches. Existing invalid names
require a rename before admission, preserving account identity and saves. Successful renames update live players. Steam names outside
the game limit remain visible as the initial draft with validation feedback,
rather than being silently truncated to the game limit. Profile lookup failure
allows manual entry without treating the Steam login as invalid. Closing first
setup signs out; cancelling a later edit preserves the saved nickname.

Steam accounts start fresh. Existing browser saves are preserved and never linked
or merged automatically. The new executable requires Steam configuration and has
no guest fallback. CHAR-01 describes shared character behavior and the isolated
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

## Acceptance — identity and shared character behavior

- Restart with the same character key preserves name and each class’s XP, level, HP, playtime and talent allocations.
- Older single-class saves load as Warrior; missing classes start fresh without overwriting existing class progress.
- Class selection fails outside wardrobe range, in the forest or during departure countdown.
- Returning by portal, early exit or death restores maximum HP and an existing Bear, cancelling pending resurrection.
- A second live session cannot use the same character key. Missing/corrupt saves surface an error.
- XP collection does not open an upgrade selector or block movement; see [PROG-01](../progression.md#prog-01--uninterrupted-progression).

Evidence: [characters.test.ts](../../../packages/server/src/characters.test.ts), [classes.test.ts](../../../packages/server/src/classes.test.ts).

Steam evidence: [server account tests](../../../packages/server/src/accounts.test.ts),
[HTTP admission tests](../../../packages/server/src/account-http-admission.test.ts) and
[browser account tests](../../../tests/accounts.spec.ts).

Gathered logs, sticks, leaves, rocks and stones are saved resource items. Each
resource stack holds at most 200 items; overflow starts another slot. Gear and
weapons remain individual entries. Existing consumable stacking is unchanged.
