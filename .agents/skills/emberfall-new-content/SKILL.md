---
name: emberfall-new-content
description: Develop or reuse Emberfall common-new definitions and shared simulation, including entities, abilities, worlds and training. Excludes changes confined to the original runtime or visual-only Pixi effects.
---

# New-runtime content and rules

Read the [common-new guide](../../../packages/common-new/README.md), its AGENTS,
and the affected [game specification](../../../docs/README.md). Read
[PROG-01](../../../docs/specs/progression.md) before changing progression.

Start with a plain definition in `common-new/src/definitions`. Keep definition
IDs, mutable instance state, and presentation assets distinct. Reuse existing
systems for forest and training; add a new system only for distinct behavior.
Keep original values when porting content. Do not import old runtime packages.

Trace a definition through its factory/system, command validation and visual
consumer. Use ordered collection replacement or `appendSceneEntities`, since
server collections are Miniplex query views. Preserve wrapping and server
authority over damage, rewards, death and saves.

Validate references and serializability, then run the affected new Node tests
and typecheck. For rule changes include boundary cases and forest/training
parity. Use `ecs.test.ts` when changing collection lifecycle and protocol tests
when changing state shape. Update the affected spec/design and package guide
when the public development or reuse contract changes.
