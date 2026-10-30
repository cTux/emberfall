import { z } from 'zod';
import { tacticsSchema } from './tactics.ts';
import { backpackSchema, inventoryItemSchema, storagesSchema } from './inventory.ts';
import { equipmentSchema } from './equipment.ts';

export const classSchema = z.string().min(1).max(128);

export const progressSchema = z
  .object({
    equipment: equipmentSchema.optional(),
    equipmentItems: z.record(z.string(), inventoryItemSchema).optional(),
    backpack: backpackSchema.optional(),
    storages: storagesSchema.optional(),
    talents: z.record(z.string(), z.number().int().nonnegative()).optional(),
    talentVersion: z.number().int().nonnegative().optional(),
    tactics: tacticsSchema.optional(),
    talentSlots: z.array(z.string().min(1).max(64).nullable()).length(4).optional(),
    level: z.number().int().min(1).max(10000),
    paragon: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    experience: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    hitpoints: z.number().finite().nonnegative(),
    maxHitpoints: z.number().finite().positive(),
    playtimeSeconds: z.number().finite().nonnegative(),
  })
  .refine((p) => p.hitpoints <= p.maxHitpoints);
export type CharacterProgress = z.infer<typeof progressSchema>;
