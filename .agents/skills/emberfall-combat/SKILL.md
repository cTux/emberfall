---
name: emberfall-combat
description: Change Emberfall combat rules, classes, enemies, companions, training or rewards across shared simulation and server validation. Excludes visual-only effects and session/save plumbing.
---

# Change Emberfall combat

Read the affected requirements in [combat](../../../docs/specs/combat.md) and [scenes](../../../docs/specs/scenes-and-village.md), then the relevant part of [simulation design](../../../docs/design/simulation.md). For progression, read [PROG-01](../../../docs/specs/progression.md): grants must not require choices or interrupt play.

Trace the behavior through common simulation, server scene ticks and existing tests before editing. Update the relevant spec/design for an intentional behavior change; a documented bug restoration does not need a new plan.

- Keep server authority over damage, health, deaths and rewards. A browser animation is not a successful hit.
- Use the shared class/hit path in forest and training. Training must not grant XP or loot.
- Check wrapped geometry, per-swing/cast deduplication and effect ownership, including Bear and ailments.
- Keep membership scaling separate from living-player reward eligibility. Preserve fractional XP and existing save compatibility when reward values change.
- If input or prediction changes, follow the command and acknowledgement path described in [movement](../../../docs/design/movement.md); do not implement a second client combat simulation.

Verify the changed rule with focused Node tests in `packages/server/src`. Use explicit timestamps for cooldowns, pause and resurrection; include the meaningful boundary or failure case. Run an affected browser scenario when the change alters warnings, aiming or feedback. Commands and evidence expectations are in [development](../../../docs/development.md).

Report the observable behavior, checks actually run and any remaining balance or visual uncertainty.
