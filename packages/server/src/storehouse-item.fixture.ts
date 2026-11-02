export const item = (itemId = 'loot-helmet', quantity = 1) => {
  return {
    id: crypto.randomUUID(),
    itemId,
    quantity,
  };
};
