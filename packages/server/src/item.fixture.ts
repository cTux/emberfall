export const item = (itemId: string, quantity = 1) => {
  return {
    id: crypto.randomUUID(),
    itemId,
    quantity,
  };
};
