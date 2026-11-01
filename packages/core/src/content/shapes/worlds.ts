import { z } from 'zod';
import { id, positive, nonnegative, point, geometry } from './primitives.ts';

// NPCs alternate dialogue topics and route stops, so each optional list needs a pair.
const MIN_NPC_CHOICES = 2;
// The shipped workstation atlas contains eight frames, addressed by indexes 0 through 7.
const MAX_WORKSTATION_ART_INDEX = 7;
// Existing villages provide two training areas and exactly two jobs per resident.
const MIN_TRAINING_ZONES = 2;
// Alternating between two home workstations is the resident lifecycle contract.
const WORKSTATIONS_PER_RESIDENT = 2;

export const worldShapes = {
  forest: z.object({
    id: z.literal('forest'),
    geometry,
    portal: point,
    durationMs: positive,
    countdownMs: positive,
    treeCellSize: positive,
    treeRadius: positive,
  }),
  village: z
    .object({
      id: z.literal('village'),
      geometry: geometry.extend({ speed: positive }),
      wardrobe: point,
      innkeeper: point.extend({ id, name: z.string().min(1) }),
      villagers: z
        .array(
          point.extend({
            id,
            name: z.string().min(1),
            buildingId: id,
            personality: z.string().min(1),
            background: z
              .object({
                work: z.string().min(1),
                experience: z.string().min(1),
                dream: z.string().min(1),
                interests: z.string().min(1),
                relationships: z.string().min(1),
                worry: z.string().min(1),
              })
              .optional(),
          }),
        )
        .optional(),
      dialogueTopics: z.array(z.string().min(1)).min(MIN_NPC_CHOICES).optional(),
      npcStops: z.array(point).min(MIN_NPC_CHOICES).optional(),
      workstations: z
        .array(
          point.extend({
            id,
            npcId: id,
            buildingId: id,
            name: z.string().min(1),
            activity: z.enum([
              'cooking',
              'brewing',
              'alchemy',
              'writing',
              'forging',
              'smelting',
              'archery',
              'leatherworking',
            ]),
            art: z.number().int().min(0).max(MAX_WORKSTATION_ART_INDEX),
            worker: point,
          }),
        )
        .optional(),
      buildings: z.array(
        point.extend({
          id,
          name: z.string().min(1),
          doorX: z.number().finite(),
          sourceX: nonnegative,
          sourceWidth: positive,
        }),
      ),
      torches: z.array(point),
      trainingZones: z
        .array(point.extend({ radius: positive, clearingRadius: positive }))
        .min(MIN_TRAINING_ZONES),
      paths: z.array(z.tuple([point, point, point, point])),
      treeSeed: nonnegative.int(),
      treeAttempts: nonnegative.int(),
      rockSeed: nonnegative.int().optional(),
      rockAttempts: nonnegative.int().optional(),
      plantSeed: nonnegative.int().optional(),
      plantAttempts: nonnegative.int().optional(),
      spawn: point.extend({ spacing: positive }),
      returnSpawn: point,
    })
    .superRefine((village, ctx) => {
      if (!village.workstations) {
        return;
      }

      const ids = new Set<string>();

      for (const [index, station] of village.workstations.entries()) {
        const resident = village.villagers?.find((npc) => {
          return npc.id === station.npcId;
        });

        if (
          ids.has(station.id) ||
          !resident ||
          resident.buildingId !== station.buildingId ||
          !village.buildings.some((building) => {
            return building.id === station.buildingId;
          })
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['workstations', index],
            message: 'Workstation needs a unique ID and its resident home building',
          });
        }

        ids.add(station.id);
      }

      for (const npc of village.villagers ?? []) {
        if (
          village.workstations.filter((station) => {
            return station.npcId === npc.id;
          }).length !== WORKSTATIONS_PER_RESIDENT
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['workstations'],
            message: `Resident '${npc.id}' needs two workstations`,
          });
        }
      }
    }),
};
