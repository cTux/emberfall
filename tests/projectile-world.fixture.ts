import type { Player, WorldState, SceneState } from '../packages/core/src/contracts/index.ts';
import { PLAYER_ATTACK_INTERVAL } from '../packages/core/src/index.ts';

export function fixture(classId: Player['classId'] = 'mage', training = false): WorldState {
  const scene: SceneState = {
    id: training ? 'training' : 'forest',
    training,
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: null,
    portals: [],
    sequence: 0,
    nextSpawn: 20000,
    damage: [],
    enemies: [1, 2].map((id) => {
      return {
        id,
        x: (training ? 140 : 2400) + 140 + id * 20,
        y: training ? 340 : 1280,
        hitpoints: 100,
        angle: 0,
      };
    }),
  };

  return {
    id: 'room',
    name: 'R',
    hostId: 'p',
    serverNow: 10000,
    players: [
      {
        id: 'p',
        name: 'P',
        x: training ? 140 : 2400,
        y: training ? 340 : 1280,
        classId,
        scene: training ? undefined : 'forest',
        attackAt: 10100 - PLAYER_ATTACK_INTERVAL,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
      },
    ],
    ...(training ? { training: scene } : { scene }),
  };
}
