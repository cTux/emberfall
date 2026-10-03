import type { SceneState } from "./scene.ts";

export const SCENE_COLLECTIONS = [
  "enemies",
  "damage",
  "playerShots",
  "explosions",
  "drops",
  "spawns",
  "projectiles",
] as const;
export type SceneCollection = (typeof SCENE_COLLECTIONS)[number];
export type SceneEntity<K extends SceneCollection> = NonNullable<SceneState[K]>[number];

/** Membership changes replace the collection; mutable entity state keeps its identity.
 * This also works with ordinary snapshots in client prediction and unit tests.
 */
export function appendSceneEntities<K extends SceneCollection>(
  scene: SceneState,
  key: K,
  ...values: SceneEntity<K>[]
) {
  (scene[key] as SceneEntity<K>[] | undefined) = [
    ...((scene[key] ?? []) as SceneEntity<K>[]),
    ...values,
  ];
}
