# Diagnostics, settings and music

[Back to Controls, interface and audio](../interface-and-audio.md).

## UI-03 — Network and performance feedback

Gameplay settings can independently show FPS, server latency and the DPS meter. The DPS meter, FPS graph and latency graph are disabled by default; their independent toggles apply immediately and persist across reloads. Existing saved visibility choices are preserved. Latency is a measured WebSocket ping/pong round trip in milliseconds, sampled every two seconds with a monotonic client clock. The toggle persists; a missing or disconnected measurement shows a dash.

The network graph plots ping, input acknowledgement delay, and local snapshot age as separate colored lines on the same millisecond axis. Input acknowledgement delay is the latest consumed command's send-to-snapshot delay, or the oldest outstanding command's age if greater. Local snapshot age includes time since receipt and interpolation backlog, but excludes network transit; it uses the monotonic client clock and differences between server timestamps. A low ping does not imply fresh movement acknowledgements or snapshots. Missing samples leave gaps in each line.

The floating performance panel is 224 pixels wide with 8-pixel side padding. A compact top row shows current FPS, ping and the shared network axis range; a shallow graph below retains the 30-second history sampled twice per second. When network diagnostics are available, a single bottom row identifies input acknowledgement delay, local snapshot age and ping by color. The complete panel stays under 100 pixels tall at the default UI font. Each trace retains its own saved visibility toggle; disabling both hides the panel.

![Verified desktop Storybook capture with supplied diagnostic samples](../../images/compact-performance-monitor.png)

The independently positioned DPS meter stays visible when the graph is hidden. It displays a compact Recount-style Damage done list: one row per current party member (only yourself when solo), ordered by total damage descending. Each row starts with a small class portrait followed by a padded rank and character name, total damage, rolling five-second DPS and percentage of party damage. Ability breakdown rows start with their existing spell, talent, ailment or companion artwork. Column headings and the total footer are omitted. Class-colored row backgrounds and bars show that percentage of total damage, with zero-width bars when no damage has been dealt. Warrior uses tan, Ranger green, Mage blue and Druid orange.

Left-clicking a character opens their damage-dealing abilities, ordered by total damage, with damage, rolling DPS and percentage of that character's damage. Weapon attacks, named talent damage, ailments and Bear damage are attributed by the server through the shared hit path; overkill and hits on dead enemies are excluded. Right-click anywhere inside the meter returns to characters and suppresses the browser context menu. An accessible Back button provides the same action; character rows support keyboard activation. Drag the header to reposition it without interfering with row clicks.

Totals cover the current connected character session, including training and forest, and reset on class change or a fresh character session. They are temporary, not saved progression. DPS retains the rolling five-second window divided by five and returns to zero after five seconds without damage. Leaving a party removes former members from the list; an unavailable selected character returns the display to the current party.

![Verified desktop damage meter with character portraits](../../images/damage-meter.png)

![Verified desktop ability breakdown with ability icons](../../images/damage-meter-abilities.png)

The Bear ability icon shows one idle frame cropped from its companion sprite sheet.

![Verified desktop Bear ability icon showing one bear](../../images/damage-meter-bear.png)

## UI-04 — Settings and music

New runtime: Settings → Account displays the saved game nickname and
opens the same nickname dialog used after first Steam login. Account data is saved
on the server, independently of local presentation preferences. See
[CHAR-05](../characters/identity.md#char-05--steam-accounts-and-nickname) and the
[account design](../../design/steam-accounts.md). The remaining settings groups are described below.

Settings groups are Gameplay, Graphics and Sound. Preferences persist locally; malformed or unavailable storage falls back to defaults. Gameplay includes auto-attack, auto-target, auto-loot items, blood puddles, damage numbers and performance visibility. Audio has independent music/effects enable switches and volumes; defaults are 0.22 music and 0.35 effects.

Auto-loot items is enabled by default. Disabling it stops attracting and collecting item drops for that player; nearby players can still collect them. XP and gold pickup stay automatic. The preference applies immediately and persists across reloads.

**Hide other players' damage numbers** is enabled by default in Gameplay settings,
including for existing saved preferences without this option. While enabled, floating
numbers show only damage dealt by your character (including attributed companion and
ailment damage) or taken by your character. Disabling it shows all scene damage numbers.
It applies immediately in forest and village training and persists locally. The
**Floating damage numbers** toggle still hides all numbers independently. These
settings do not change combat, health, damage events or DPS totals.

![Verified desktop Gameplay settings with other players' damage numbers hidden by default](../../images/damage-number-settings.png)

The new client's Gameplay settings include **Debug mode: show hitboxes**, disabled
by default and persisted locally. It takes effect immediately in village, training
and forest at every graphics preset. Show whole-model damage circles and projectile
hitboxes, scenery collision shapes, and labeled attack, splash, collection and interaction
ranges. Omit feet zones and projectile terrain zones. Use the shared simulation's model
dimensions for damage bodies and rule dimensions for other shapes. Decorative critters,
blood, labels and particles have no hitboxes. Outlines follow displayed positions
and wrapped camera geometry; authoritative server positions still decide hits.

[FREE fantasy music by TimberwolfGames](https://timberwolfgames.itch.io/free-fantasy-music) supplies six CC0 tracks: Intro / Theme_001 (start), In The Woods / Adventure (village), and Trials / Wastelands (combat). Each two-track playlist repeats indefinitely and resumes its selection when returning to an area. Music crossfades between areas, starts after a user gesture, pauses in hidden tabs, and has independent enable/volume controls. Sampled effects use bounded voice pools and the existing CC0 Ninja Adventure pack. Original licenses and filenames are in `packages/client/public/audio/CREDITS.txt` and `CC0.txt`.
