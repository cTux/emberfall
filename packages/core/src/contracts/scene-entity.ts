import type { SceneCollection } from './scene-collection.ts';
import type { SceneState } from './scene.ts';

export type SceneEntity<K extends SceneCollection> = NonNullable<SceneState[K]>[number];
