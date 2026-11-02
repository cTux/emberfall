import type { Player } from '@emberfall/core/contracts';

export interface Scheduled {
  generation: number;
  at: number;
  until: number;
  interval: number;
  owner: Player;
  classId: string;
  nodeId: string;
  run: (at: number, players: Player[]) => void;
}
