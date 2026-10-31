import type { DragEvent } from 'react';

export const INVENTORY_DRAG_PREFIX = 'application/x-emberfall-inventory-';
export interface InventoryDrop {
  accepts: readonly string[];
  onDrop(inventory: string, id: string, modifiers: { shiftKey: boolean; ctrlKey: boolean }): void;
}

export function inventoryDropProps(drop?: InventoryDrop) {
  const source = (event: DragEvent) =>
    drop?.accepts.find((inventory) =>
      event.dataTransfer.types.includes(`${INVENTORY_DRAG_PREFIX}${inventory}`),
    );

  return {
    onDragOver(event: DragEvent) {
      if (!source(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    onDrop(event: DragEvent) {
      const inventory = source(event);
      if (!inventory) return;
      event.preventDefault();
      event.stopPropagation();
      const id = event.dataTransfer.getData(`${INVENTORY_DRAG_PREFIX}${inventory}`);
      if (id && id.length <= 64) drop?.onDrop(inventory, id, event);
    },
  };
}
