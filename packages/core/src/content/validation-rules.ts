import { z } from 'zod';
import { progressSchema as progressShape, clientMessage as messageShape } from '@emberfall/common';
import type { Registries } from './contracts.ts';
import type { createEquipmentRules } from './equipment-rules.ts';
import type { createItemRules } from './item-rules.ts';
import type { createStorageRules } from './storage-rules.ts';

export function createValidationRules(
  content: Registries,
  equipment: ReturnType<typeof createEquipmentRules>,
  items: ReturnType<typeof createItemRules>,
  storage: ReturnType<typeof createStorageRules>,
) {
  const { equipmentSchema } = equipment;
  const { itemSchema, backpackSchema } = items;
  const { storagesSchema } = storage;
  const classSchema = z.string().refine((id) => content.classes.has(id), 'Unknown class');
  const progressSchema = progressShape.superRefine((progress, ctx) => {
    for (const [slot, item] of Object.entries(progress.equipmentItems ?? {})) {
      if (
        !content.slots.has(slot) ||
        progress.equipment?.[slot] !== item.itemId ||
        !itemSchema.safeParse(item).success
      )
        ctx.addIssue({
          code: 'custom',
          path: ['equipmentItems', slot],
          message: 'Invalid equipped item instance',
        });
    }

    const instances = [
      ...Object.values(progress.equipmentItems ?? {}),
      ...(progress.backpack ?? []),
      ...(progress.storages ?? []).flatMap((storage) => storage.items),
    ];
    if (new Set(instances.map((item) => item.id)).size !== instances.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate owned item identity' });
    for (const [key, schema] of [
      ['equipment', equipmentSchema],
      ['backpack', backpackSchema],
      ['storages', storagesSchema],
    ] as const) {
      if (progress[key] === undefined) continue;
      const parsed = schema.safeParse(progress[key]);
      if (!parsed.success)
        ctx.addIssue({ code: 'custom', path: [key], message: parsed.error.message });
    }
  });
  const clientMessage = messageShape.superRefine((message, ctx) => {
    if ('classId' in message && !content.classes.has(message.classId))
      ctx.addIssue({ code: 'custom', path: ['classId'], message: 'Unknown class' });
    if (message.type === 'unequip' && !content.slots.has(message.slot))
      ctx.addIssue({ code: 'custom', path: ['slot'], message: 'Unknown slot' });
    const geometry = content.worlds.require('forest').value as {
      geometry: { width: number; height: number };
    };
    if (
      'aimX' in message &&
      (message.aimX < 0 ||
        message.aimX > geometry.geometry.width ||
        message.aimY < 0 ||
        message.aimY > geometry.geometry.height)
    )
      ctx.addIssue({ code: 'custom', message: 'Aim outside world' });
  });

  return { classSchema, progressSchema, clientMessage };
}
