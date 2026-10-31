import type { Enemy, Player, SceneState } from '@emberfall/common';
import type { CharacterStats } from '../content/rules.ts';
import { talentRank } from '../talent-tree.ts';

interface FighterState {
  stats?: CharacterStats;
  scene: SceneState;
  classId: string;
  hits: number;
  guardUntil: number;
  guardReadyAt: number;
  barrier: number;
  barrierUntil: number;
  wallUntil: number;
  wallRank: number;
  reprisalAt: number;
  sequence: { slot: number; at: number }[];
  rhythmAt: number;
  fissure?: { x: number; y: number; until: number };
  empoweredUntil?: number;
  wallPrevented?: boolean;
  rebirthAt?: number;
  challengeHits?: Set<number>;
}
const fighters = new WeakMap<Player, FighterState>();
const generations = new WeakMap<Player, number>();
export function clearTalentEffects(player: Player) {
  fighters.delete(player);
  generations.set(player, (generations.get(player) ?? 0) + 1);
}

export const deepCuts = new WeakMap<Enemy, WeakMap<Player, number>>();
export function state(player: Player, scene: SceneState): FighterState {
  let value = fighters.get(player);
  if (!value || value.scene !== scene || value.classId !== (player.classId ?? 'warrior')) {
    value = {
      scene,
      classId: player.classId ?? 'warrior',
      hits: 0,
      guardUntil: 0,
      guardReadyAt: 0,
      barrier: 0,
      barrierUntil: 0,
      wallUntil: 0,
      wallRank: 0,
      reprisalAt: 0,
      sequence: [],
      rhythmAt: 0,
    };
    fighters.set(player, value);
  }

  return value;
}

interface Scheduled {
  generation: number;
  at: number;
  until: number;
  interval: number;
  owner: Player;
  classId: string;
  nodeId: string;
  run: (at: number, players: Player[]) => void;
}
const scheduled = new WeakMap<SceneState, Scheduled[]>();
export function schedule(
  scene: SceneState,
  owner: Player,
  nodeId: string,
  at: number,
  duration: number,
  interval: number,
  run: Scheduled['run'],
) {
  const entries = scheduled.get(scene) ?? [];
  entries.push({
    generation: generations.get(owner) ?? 0,
    at,
    until: at + duration,
    interval,
    owner,
    classId: owner.classId ?? 'warrior',
    nodeId,
    run,
  });
  scheduled.set(scene, entries);
}

export function tickTalentEffects(scene: SceneState, players: Player[], now: number) {
  if (scene.pausedAt !== undefined || scene.phase !== 'active') return;
  const entries = scheduled.get(scene) ?? [];
  scheduled.set(
    scene,
    entries.filter((entry) => {
      if (
        entry.generation !== (generations.get(entry.owner) ?? 0) ||
        entry.owner.hitpoints <= 0 ||
        !players.includes(entry.owner) ||
        entry.classId !== (entry.owner.classId ?? 'warrior') ||
        !talentRank(entry.owner, entry.nodeId)
      )
        return false;
      while (entry.at <= now && entry.at <= entry.until) {
        entry.run(entry.at, players);
        entry.at += entry.interval;
      }

      return entry.at <= entry.until;
    }),
  );
}

export function shiftTalentEffects(scene: SceneState, players: Player[], delay: number) {
  for (const entry of scheduled.get(scene) ?? []) {
    entry.at += delay;
    entry.until += delay;
  }

  for (const player of players) {
    const value = fighters.get(player);
    if (!value || value.scene !== scene) continue;
    for (const key of [
      'guardUntil',
      'guardReadyAt',
      'barrierUntil',
      'wallUntil',
      'reprisalAt',
      'rhythmAt',
    ] as const)
      value[key] += delay;
    if (value.fissure) value.fissure.until += delay;
    if (value.empoweredUntil) value.empoweredUntil += delay;
    for (const entry of value.sequence) entry.at += delay;
  }
}
