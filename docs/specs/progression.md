# Progression without interruptions

Status: implemented automatic per-class leveling and paragon progression. This document replaces the suggestion to choose one of three upgrades on each run level.

## PROG-01 — Uninterrupted progression

Automatic level and XP grants must not require the player to stop playing, open a selector, make an upgrade choice, or confirm a reward. Talents are a voluntary configuration exception: players may spend earned points from N at any time; no level-up opens the window or waits for spending. Moving the selector to a small panel while combat continues still requires a choice and does not meet this requirement. A teammate's progression must not pause the shared game or wait for a party vote.

Any future progression feedback must leave movement, targeting and attacking available. Optional information may be shown without taking focus or requiring dismissal. This constraint concerns progression; existing voluntary settings, wardrobe selection, portal readiness and exit dialogs remain separate features.

## Current behavior

- XP is granted through kill credit and shared pickups. The server automatically spends XP on level-ups without an upgrade offer.
- Level, paragon, unspent XP and reserved talent data are saved independently for each class, surviving death, scene returns, class changes and reconnects through the existing save lifecycle.
- In the new runtime, each gold pickup adds one coin to its account's shared Storehouse balance without a prompt. Coins can be spent or earned through optional Innkeeper trading in the new runtime.
- The wardrobe changes class in the village. It is not a progression reward flow.

See [characters](characters.md) and [combat rewards](combat.md#combat-05--rewards-and-damage-accounting) for implemented rules.

## PROG-02 — Automatic levels and paragon

New characters start at level 1, paragon 0. The next level-up requires
`50 * 2 ** (level + paragon - 1)` XP: 50, 100, 200, and so on. Every affordable
level-up is applied, retaining fractional unspent XP. Normal level stops at 20;
further level-ups increase paragon without a cap, continuing the exponential curve.
Level-ups do not change health, stats or abilities.

Older saves without paragon start at 0; legacy levels above 20 become level 20
with the excess added to paragon. No other progress is reset. The existing
five-second autosave, disconnect and shutdown policy applies to all progression.

Party cards show a thin XP bar beneath health with current/required XP. The
normal level and, when positive, paragon level are visible. The client only
displays server-confirmed progress and uses the shared requirement formula.

## PROG-03 — Talents

Each normal level above 1 grants one talent point (level minus one, less learned
nodes); paragon grants none. Existing characters receive their earned budget.
N or the HUD opens a voluntary, scrollable linked tree shared by every class.
The empty center is free. Curved links connect an irregular branching layout
with 52 stat nodes and four ability nodes. Stat nodes remain 46px; ability nodes
are 34px and the empty center is 22px. Every other node costs one point and
requires its previous node; learning unlocks its children. Allocations save independently per
class using the existing save lifecycle, including transactional learning.

Four paths grant +1 power, +10% attack speed, +5 percentage points critical
chance and +10 percentage points critical damage. Attack speed bonuses add
before multiplying gear attack speed and also shorten talent ability cooldowns.
Four ability nodes unlock class-specific abilities in fixed action-bar slots
1–4, cast by number key or click toward the cursor independently of the base
attack's auto-target setting. Each class has four distinct abilities using its existing attack family. Server validation
owns prerequisites, budget, learned abilities, area eligibility and cooldowns.
No automatic allocation, reset or forced prompt is introduced. Legacy reserved
unknown talent entries remain saved but grant no effects and consume no points.

## Acceptance for any future implementation

1. Cross a progression threshold while moving and attacking: inputs continue, no modal or choice appears, and rewards do not wait for confirmation.
2. Cross multiple thresholds or earn rewards during a reconnect: each server-owned grant occurs once without an input prompt.
3. With two clients, one player's progression does not pause or block the other.
4. Optional feedback does not steal keyboard focus, obscure necessary threat information, or require dismissal; reduced-motion preferences apply.

Coverage: [server progression tests](../../packages/server/src/progression.test.ts)
and [XP HUD and rejoin scenario](../../tests/progression.spec.ts). These references
describe coverage; execution evidence is reported separately.
