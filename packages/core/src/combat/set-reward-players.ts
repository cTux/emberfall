import { rewardPlayers } from './reward-players.ts';
import type { SceneState, Player } from '@emberfall/common';

export function setRewardPlayers(scene: SceneState, players: Player[]) {
  rewardPlayers.set(scene, players);
}
