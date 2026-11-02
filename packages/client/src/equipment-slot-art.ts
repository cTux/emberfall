const builtinSlots = new Set([
  'weapon',
  'gloves',
  'helmet',
  'bodyArmor',
  'leggings',
  'boots',
  'amulet',
  'offHand',
  'ring',
]);
export const equipmentSlotArt = (id: string) => {
  return `slot-${builtinSlots.has(id) ? id : 'offHand'}`;
};
