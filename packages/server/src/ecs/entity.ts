import type {
  SceneState,
  Player,
  VillageNpc,
  SceneCollection,
  SceneEntity,
} from '@emberfall/core/contracts';

export type Entity = { scene?: SceneState; order: number; player?: Player; npc?: VillageNpc } & {
  [K in SceneCollection]?: SceneEntity<K>;
};
