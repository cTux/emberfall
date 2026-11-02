import type { BooleanPreference } from './boolean-preference.ts';

type Toggle = { key: BooleanPreference; label: string; description?: string };

export const GAMEPLAY_CONTROLS: readonly Toggle[] = [
  { key: 'autoAttack', label: 'Auto-attack (F)' },
  { key: 'autoTarget', label: 'Auto-target (G)' },
  {
    key: 'autoLoot',
    label: 'Auto-loot items',
    description: 'Automatically collect nearby item drops. XP and gold are always collected.',
  },
  { key: 'lootHints', label: 'Loot hints' },
  { key: 'bloodPuddles', label: 'Blood puddles' },
  { key: 'hideGatheringHintInCombat', label: 'Hide interact hint during combat' },
  { key: 'hideHealthBarsInTown', label: 'Hide health bars in town' },
  { key: 'damageNumbers', label: 'Floating damage numbers' },
  { key: 'hideOtherPlayerDamageNumbers', label: "Hide other players' damage numbers" },
  { key: 'dps', label: 'DPS meter' },
  { key: 'fps', label: 'FPS graph' },
  { key: 'latency', label: 'Latency graph' },
  {
    key: 'debugHitboxes',
    label: 'Debug mode: show hitboxes',
    description:
      'Body hitboxes, scenery collisions and labeled interaction ranges. Decorative entities have no hitboxes. Overlays follow displayed positions; the server decides hits. Cyan: whole-model bodies. Magenta: projectiles. Yellow: scenery. Orange: ranges.',
  },
];
