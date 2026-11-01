import { z } from 'zod';
import { tacticsSchema } from './tactics.ts';
import { backpackSchema, inventoryItemSchema, storagesSchema } from './inventory.ts';
import { equipmentSchema } from './equipment.ts';
import { CONTRACT_LIMITS } from './limits.ts';

export const classSchema = z.string().min(1).max(CONTRACT_LIMITS.contentIdCharacters);

export const progressSchema = z
  .object({
    equipment: equipmentSchema.optional(),
    equipmentItems: z.record(z.string(), inventoryItemSchema).optional(),
    backpack: backpackSchema.optional(),
    storages: storagesSchema.optional(),
    talents: z.record(z.string(), z.number().int().nonnegative()).optional(),
    talentVersion: z.number().int().nonnegative().optional(),
    tactics: tacticsSchema.optional(),
    talentSlots: z
      .array(z.string().min(1).max(CONTRACT_LIMITS.instanceIdCharacters).nullable())
      .length(CONTRACT_LIMITS.talentSlots)
      .optional(),
    level: z.number().int().min(1).max(CONTRACT_LIMITS.characterLevel),
    paragon: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    experience: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    coins: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    hitpoints: z.number().finite().nonnegative(),
    maxHitpoints: z.number().finite().positive(),
    playtimeSeconds: z.number().finite().nonnegative(),
  })
  .refine((p) => {
    return p.hitpoints <= p.maxHitpoints;
  });
export type CharacterProgress = z.infer<typeof progressSchema>;
