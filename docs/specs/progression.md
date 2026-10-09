# Progression without interruptions

Status: accepted product constraint; a new progression system is not implemented or selected. This document replaces the suggestion to choose one of three upgrades on each run level.

## PROG-01 — Uninterrupted progression

Progression must not require the player to stop playing, open a selector, make an upgrade choice, or confirm a reward. Moving the selector to a small panel while combat continues still requires a choice and does not meet this requirement. A teammate's progression must not pause the shared game or wait for a party vote.

Any future progression feedback must leave movement, targeting and attacking available. Optional information may be shown without taking focus or requiring dismissal. This constraint concerns progression; existing voluntary settings, wardrobe selection, portal readiness and exit dialogs remain separate features.

## Current behavior

- XP is granted through kill credit and shared pickups; no level threshold or upgrade offer is implemented.
- Level, XP and reserved talent data are saved independently for each class.
- In the new runtime, each gold pickup adds one coin to its collector's saved class balance without a prompt. Coins can be spent or earned through optional Innkeeper trading in the new runtime. Original-runtime gold remains visual only.
- The wardrobe changes class in the village. It is not a progression reward flow.

See [characters](characters.md) and [combat rewards](combat.md#combat-05--rewards-and-damage-accounting) for implemented rules.

## Decisions still open

The next feature, progression lifetime (per run or persistent), XP thresholds, effects, scaling and any role for pre-run configuration remain undecided. Automatic stat growth or automatic ability evolution could satisfy PROG-01, but neither is an approved implementation. Do not treat the earlier proposed upgrade table as a requirement.

## Acceptance for any future implementation

1. Cross a progression threshold while moving and attacking: inputs continue, no modal or choice appears, and rewards do not wait for confirmation.
2. Cross multiple thresholds or earn rewards during a reconnect: each server-owned grant occurs once without an input prompt.
3. With two clients, one player's progression does not pause or block the other.
4. Optional feedback does not steal keyboard focus, obscure necessary threat information, or require dismissal; reduced-motion preferences apply.

These are future acceptance scenarios, not claims that progression tests or gameplay already exist. The [implementation plan](../plans/implementation.md) records the decision boundary.
