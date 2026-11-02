export const swordHits = new WeakMap<
  object,
  { sceneId: string; at: number; enemies: Set<number> }
>();
