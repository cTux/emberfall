export interface InventoryDrop {
  accepts: readonly string[];
  onDrop(inventory: string, id: string, modifiers: { shiftKey: boolean; ctrlKey: boolean }): void;
}
