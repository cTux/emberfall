import { normalizeTalents, type createGame } from '@emberfall/core';
import type { CharacterProgress, ClassId, Player } from '@emberfall/common';

export function createProgressCodec(context: ReturnType<typeof createGame>) {
  const {
    freshStorages,
    storehouseSchema,
    addItem,
    CONSUMABLES,
    STORAGE_SLOTS,
    progressSchema,
    classSchema,
    starterEquipment,
    validateClassEquipment,
    syncEquipmentVitals,
  } = context.rules;
  const CLASS_IDS = context.registries.classes.values().map((player) => player.id);
  const INITIAL_PROGRESS = context.registries.settings.require('initialProgress')
    .value as CharacterProgress;
  const freshProgress = (classId?: ClassId): CharacterProgress => ({
    ...structuredClone(INITIAL_PROGRESS),
    storages: freshStorages(),
    ...(classId ? { equipment: starterEquipment(classId) } : {}),
  });
  function classProgress(value: unknown, classId: ClassId): CharacterProgress {
    const progress = progressSchema.parse(value);
    progress.paragon = (progress.paragon ?? 0) + Math.max(0, progress.level - 20);
    progress.level = Math.min(20, progress.level);
    normalizeTalents(progress, classId);
    progress.coins ??= 0;
    progress.backpack ??= [];
    progress.storages ??= freshStorages();
    progress.equipment = validateClassEquipment(
      progress.equipment ?? starterEquipment(classId),
      classId,
    );
    const derived = { ...progress, classId } as Player;
    syncEquipmentVitals(derived);
    return progressSchema.parse(derived);
  }
  function decodeProgress(raw: string) {
    const data = JSON.parse(raw);
    if (data.classes)
      for (const id of Object.keys(data.classes)) {
        if (!context.registries.classes.has(id))
          throw new Error(
            `Save contains unknown class '${id}'; load its mod before opening this save`,
          );
      }
    if (data.formatVersion !== undefined && data.formatVersion !== 1 && data.formatVersion !== 2)
      throw new Error('Unsupported save format');
    const classId: ClassId = data.classes ? classSchema.parse(data.classId) : 'warrior';
    const classes = Object.fromEntries(
      CLASS_IDS.map((id) => [
        id,
        classProgress(
          data.classes?.[id] ?? (id === 'warrior' && !data.classes ? data : freshProgress(id)),
          id,
        ),
      ]),
    ) as Record<ClassId, CharacterProgress>;
    let storehouse;
    if (data.formatVersion === 2) storehouse = storehouseSchema.parse(data.storehouse);
    else {
      storehouse = { coins: 0, storages: freshStorages() };
      const order = [classId, ...CLASS_IDS.filter((id) => id !== classId)];
      for (const id of order) {
        const progress = classes[id];
        storehouse.coins += progress.coins ?? 0;
        for (const [tab, storage] of progress.storages!.entries()) {
          const destination = storehouse.storages[tab];
          const defaultName = `Storage ${tab + 1}`;
          if (destination.name === defaultName && storage.name !== defaultName)
            destination.name = storage.name;
          for (const item of storage.items) {
            const stacks =
              Object.hasOwn(CONSUMABLES, item.itemId) &&
              destination.items.some((entry) => entry.itemId === item.itemId);
            if (destination.items.length < STORAGE_SLOTS || stacks)
              addItem(destination.items, item, STORAGE_SLOTS);
            else addItem(progress.backpack!, item, Number.MAX_SAFE_INTEGER);
          }
        }
      }
      storehouse = storehouseSchema.parse(storehouse);
    }
    for (const id of CLASS_IDS) {
      delete classes[id].coins;
      delete classes[id].storages;
    }
    return { classId, classes, storehouse, progress: { ...classes[classId], ...storehouse } };
  }

  return { classIds: CLASS_IDS, freshProgress, classProgress, decodeProgress };
}
