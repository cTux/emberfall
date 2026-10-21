---
name: emberfall-new-content
description: Develop or reuse Emberfall core mod definitions, registries and shared simulation, including items, slots, stats, classes, abilities, enemies, worlds and training. Excludes visual-only Pixi effects and session/save plumbing.
---

# Registered content and shared rules

Read the [core guide](../../../packages/core/README.md), its AGENTS,
the [mod design](../../../docs/design/mods.md), and the affected
[game specification](../../../docs/README.md). Read
[PROG-01](../../../docs/specs/progression.md) before changing progression.

Register plain content through `core/src/mods/base.mod.ts` or an additional
bundled module listed in `core/src/mods/index.ts`. Definition views are derived
from the ready catalog. Do not import the default game or its views inside a mod.
Keep common independent: it owns contracts, structural schemas and pure geometry;
core owns semantic validation, content and shared rules.

Preserve definition IDs, base values and saved/wire compatibility. Keep mutable
instance state and presentation assets separate from immutable content. Reuse
supported mechanic/art families; new families require explicit engine support
and validation. Additional slots declare layout/compatibility; numeric stats
aggregate without inventing combat effects; added enemies do not automatically
join spawn policies; register a `spawnRules` entry explicitly. Preserve fixed scene/ailment identities and the one-Bear
state model unless the requested feature explicitly changes those contracts.

Trace content through registry validation, rules, commands/saves and the visual
consumer. Use fresh `createGame` contexts for fixtures and bind tested helpers to
the same context. A successful lookup alone does not demonstrate extension.
Use ordered collection replacement or `appendSceneEntities`, since server
collections are Miniplex query views. Preserve wrapping, forest/training parity
and server authority over damage, rewards, death and saves.

Run core package checks and affected server/prediction tests. Include invalid
references, boundary cases and compatibility failures; use ECS/protocol tests
when changing membership or state shape. Update the spec/design and package
guide when the development contract changes. Report only checks actually run.
