import { ARENA } from './arena.ts';
import { WARDROBE } from './wardrobe.ts';
import { NPC_STOPS } from './npc-stops.ts';
import { BUILDINGS } from './buildings.ts';
import { TORCHES } from './torches.ts';
import { TRAINING_ZONES } from './training-zones.ts';
import { PATH_CURVES } from './path-curves.ts';
import { INNKEEPER, VILLAGERS, DIALOGUE_TOPICS, WORKSTATIONS } from './village-residents.ts';

export const VILLAGE_DEFINITION = {
  id: 'village',
  geometry: ARENA,
  wardrobe: WARDROBE,
  innkeeper: INNKEEPER,
  villagers: VILLAGERS,
  dialogueTopics: DIALOGUE_TOPICS,
  npcStops: NPC_STOPS,
  workstations: WORKSTATIONS,
  buildings: BUILDINGS,
  torches: TORCHES,
  trainingZones: TRAINING_ZONES,
  paths: PATH_CURVES,
  // Fixed seeds preserve scenery identity across clients; attempt budgets retain its existing density.
  treeSeed: 8927,
  treeAttempts: 550,
  rockSeed: 3719,
  rockAttempts: 300,
  plantSeed: 6143,
  plantAttempts: 1000,
  // Existing spawn/return anchors keep arrivals in the plaza, with 22-unit separation between players.
  spawn: { x: 420, y: 340, spacing: 22 },
  returnSpawn: { x: 480, y: 360 },
} as const;
