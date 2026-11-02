import type { Bear, SceneState, Enemy, Tactics } from '@emberfall/common';

// Existing hazard margins start avoidance before contact and move the bear beyond the telegraph edge.

export const companionDecisions = new WeakMap<
  Bear,
  {
    at: number;
    scene: SceneState | undefined;
    forest: boolean;
    tactics: Tactics;
    target: Enemy | undefined;
    following: boolean;
    destination: { x: number; y: number; hitpoints: number };
  }
>();
