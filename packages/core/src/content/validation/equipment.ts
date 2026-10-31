import type { ValidationContext } from './context.ts';

export function validateEquipment(context: ValidationContext) {
  const { r, check, positive, nonnegative, reference } = context;
  for (const stat of r.stats.values()) {
    check(
      typeof stat.label === 'string' &&
        Number.isFinite(stat.default) &&
        stat.aggregation === 'sum' &&
        ['number', 'percent'].includes(stat.format),
      'stats',
      stat.id,
      'invalid default, aggregation or format',
    );
  }

  for (const slot of r.slots.values()) {
    check(
      typeof slot.label === 'string' &&
        positive(slot.column) &&
        positive(slot.row) &&
        Number.isInteger(slot.column) &&
        Number.isInteger(slot.row) &&
        slot.gearTypes.length > 0,
      'slots',
      slot.id,
      'invalid label, layout or gearTypes',
    );
    for (const type of slot.gearTypes) {
      reference('slots', slot.id, 'gearTypes', type);
    }
  }

  for (const item of r.items.values()) {
    check(
      typeof item.name === 'string' && (item.price === undefined || nonnegative(item.price)),
      'items',
      item.id,
      'invalid name or price',
    );
    check(
      item.kind === 'gear' || item.kind === 'consumable' || item.kind === 'resource',
      'items',
      item.id,
      'unsupported kind',
    );
    if (item.kind === 'gear') {
      reference('items', item.id, 'gearTypes', item.gearType);
    } else if (item.kind === 'consumable') {
      check(positive(item.healing), 'items', item.id, 'invalid healing');
    }

    if (item.kind === 'gear' && item.damageType !== undefined) {
      check(
        ['physical', 'fire', 'poison', 'nature'].includes(item.damageType),
        'items',
        item.id,
        'unsupported damageType',
      );
    }

    for (const [key, value] of Object.entries(item.kind === 'gear' ? item.stats : {})) {
      reference('items', item.id, 'stats', key);
      check(Number.isFinite(value), 'items', item.id, `invalid stat '${key}'`);
    }
  }
}
