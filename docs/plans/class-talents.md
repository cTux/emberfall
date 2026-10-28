# Class talent overhaul

Status: implemented and locally verified; PR and merge readiness checked separately.

## Accepted behavior

- Each class has three independent columns of ten talents. Rows unlock at
  levels 1, 2, 4, 6, 8, 10, 12, 14, 16 and 18. Every node costs one point per
  rank and has two ranks; prerequisite allocations are never required.
- Normal level equals the total earned budget, including one point at level 1.
  Paragon awards none. Talents grant abilities and mechanical interactions,
  never permanent character-stat bonuses. Spending remains voluntary.
- Rows 2, 4, 6 and 8 in each column unlock abilities. Players assign learned
  abilities to four slots with a right-click picker; extensions may be learned
  before their referenced abilities.
- Warrior: Weapon Mastery, Bloodletting, Guardian. Open Wounds adds percentage
  points to the existing weapon bleed chance rather than replacing it.
- Ranger: Marksmanship, Venom, Survival. Mage: Fire, Arcane, Frost Ward.
  Druid: Nature Magic, Beastbond, Restoration. Every third column protects or heals.
- Keep the bullseye's existing 50-coin transactional reset. Migrate every class
  allocation once, including offline accounts on load, to a fully refunded budget.
  Preserve normal levels, paragon, XP, inventory, currency and identity.
- Generate class talent icon atlases and animated cast artwork, reuse themed
  custom tooltips, and render cast particles from confirmed combat events.

## Implementation and verification order

1. Define class talents, point/rank rules, allocation migration and ability selection.
2. Implement authoritative combat effects with shared forest/training behavior.
3. Integrate the three-column UI, rank tooltips, action picker and generated art.
4. Cover ranks, thresholds, budgets, migrations, cooldown ownership, proc chains,
   defensive effects and class-specific abilities with executable tests.
5. Run formatting, lint, typecheck, tests, build and isolated browser scenarios.
6. Review the full diff, create a PR, inspect current-head CI and review feedback,
   then merge only after the readiness gate passes.

## Local verification

- Full Node suite: 318 tests passed. Focused talent/equipment follow-up: 27 passed.
- Shared UI: seven talent/action-bar/tooltip browser tests passed.
- Game browser checks: class panels and generated cast themes, two-rank learning,
  tooltips, action assignment, cooldowns, persistence, normal/paragon progression,
  class training/reconnect, Druid roots, boss combat and portal difficulty.
- Lint, typecheck and production build passed. Changed-file formatting passed.
  Whole-checkout formatting reports CRLF differences in pre-existing Windows
  files; unrelated files were not reformatted.
- Generated icon/VFX atlases were inspected by the generating Astra agent and
  in the actual client. Source prompts, dimensions, alpha checks and license
  provenance ship beside the assets.

Initial numeric balance still needs multiplayer playtesting. The existing village
Bear navigation can stall behind a tree; companion combat tests place Bear beside
its owner, while a separate forest scenario verifies pursuit and boss combat.
Old talent allocations are intentionally refunded on the updated server's next
save load. This migration requires running the updated server, not only the client.

The pre-existing broad renderer pixel test still expects one painted edge but
observes two. This was reproduced with the original `combat-effects.ts` restored
for the comparison; the talent source was restored immediately afterward. The
separate talent-native-renderer test passes for all twelve cast themes. This
unrelated edge assertion was not weakened or changed.
