import type { Scene } from './scene.ts';
import type { Player, ChatMessage, SceneState } from '@emberfall/core/contracts';

export interface SceneWorld {
  rewardPlayers?: Player[];
  chat?: ChatMessage[];
  players: Map<string, Player>;
  scene?: Scene;
  training?: SceneState;
  skipTraining?: boolean;
  runKey?: string;
  voters?: Player[];
  resources?: Record<string, import('@emberfall/core/contracts').ResourceState>;
}
