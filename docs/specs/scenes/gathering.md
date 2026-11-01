# Resource gathering

[Back to Village and forest scenes](../scenes-and-village.md).

## VILLAGE-07 — Gathering

Trees, plants, rocks and stones in both areas can be gathered by clicking them
or pressing E within 65 world units of their roots. Starting a gather takes five
seconds, with no cooldown between gathers. A thin yellow progress bar directly
above the resource shows one small green zone and a moving vertical indicator,
without text above or below the bar. Pressing E inside the zone subtracts two seconds from the
remaining time and immediately replaces the zone. Misses have no penalty; the
timer completes without input. Completion awards one gather, never before zero.
Leaving range, dying, disconnecting or changing areas cancels the attempt without
rewards or resource depletion. Simultaneous gathers revalidate availability at
completion. The timed progress and skill-check mechanics are reusable for future
professions and crafting; those systems are outside this change.
Server validation owns timing, skill checks, range,
area, rewards and inventory capacity. Each rock or stone gives one matching item;
village plants give one matching plant item (fern, berry bush, meadow grass,
violet wildflowers or flowering herb), while forest plants give one Plant.
Plant inventory icons reuse the gathered node's artwork. Existing leaves remain
valid inventory items. Each tree accepts five gathers, independently rolling one
log (80%), one stick (40%) and one leaf (20%) per gather. A partially gathered tree
shows a health bar; depleted nodes remain visible as stumps, rubble or cut stems.
An exhausted node restores after one hour of wall time; partial trees also reset
one hour after their first gather. Resource state is shared within the running
world, including forest re-entry, and resets when that world is disposed.
Inventory rejection leaves the resource and all rewards unchanged.
Swamp and Desert use dedicated resources and drops described in
[SCENE-07](forest.md#scene-07--dimensions); the gathering clock, capacity validation
and restore cadence are shared.
