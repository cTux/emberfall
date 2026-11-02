import type { SceneState } from '@emberfall/core/contracts';

// Seven dummy IDs occupy the initial training layout; subsequent transient IDs start after them.
import { TRAINING_DEFINITION } from './definitions/encounters/training.ts';
import { TRAINING_ZONES } from './world.ts';
// Seven dummy IDs occupy the initial training layout; subsequent transient IDs start after them.
const TRAINING_INITIAL_SEQUENCE = 7;
export function createTrainingScene(now: number): SceneState {
  return {
    id: 'lobby-training',
    training: true,
    type: 'Forest',
    difficulty: 'Easy',
    phase: 'active',
    ready: [],
    countdownAt: null,
    endsAt: null,
    portals: [],
    sequence: TRAINING_INITIAL_SEQUENCE,
    nextSpawn: now + TRAINING_DEFINITION.refreshMs,
    damage: [],
    enemies: [
      {
        x: TRAINING_ZONES[0].x,
        y: TRAINING_ZONES[0].y,
      },
      ...Array.from(
        {
          length: TRAINING_DEFINITION.triangleRows,
        },
        (_, row) => {
          return row;
        },
      ).flatMap((row) => {
        return Array.from(
          {
            length: row + 1,
          },
          (_, col) => {
            return {
              x: TRAINING_ZONES[1].x + (col - row / 2) * TRAINING_DEFINITION.spacing,
              y:
                TRAINING_ZONES[1].y -
                TRAINING_DEFINITION.spacing +
                row * TRAINING_DEFINITION.spacing,
            };
          },
        );
      }),
    ].map((position, index) => {
      return {
        ...position,
        id: index + 1,
        name: TRAINING_DEFINITION.dummyName,
        archetype: 'skeleton' as const,
        angle: 0,
        hitpoints: TRAINING_DEFINITION.hitpoints,
        maxHitpoints: TRAINING_DEFINITION.hitpoints,
      };
    }),
  } satisfies SceneState;
}
