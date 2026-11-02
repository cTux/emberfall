import type { SceneCollection } from './scene-collection.ts';
import type { SceneEntity } from './scene-entity.ts';
import type { SceneState } from './scene.ts';

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
