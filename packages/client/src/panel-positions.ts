import type { PanelPosition } from "@emberfall/ui";

export const panelPositions = {
  load(key: string): PanelPosition {
    try {
      const value = JSON.parse(localStorage.getItem(`emberfall-new.position.${key}`) ?? "null");
      if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) return value;
    } catch {
      /* Invalid or unavailable storage falls back to the default layout. */
    }
    return { x: 0, y: 0 };
  },
  save(key: string, position: PanelPosition) {
    try {
      localStorage.setItem(`emberfall-new.position.${key}`, JSON.stringify(position));
    } catch {
      /* Dragging still works when storage is disabled. */
    }
  },
};
