import { MILLISECONDS_PER_SECOND } from '@emberfall/common';
// Keep player speech visible for the existing ten-second chat bubble duration.
const CHAT_DISPLAY_MS = 10_000;
// Ignore sub-microsecond floating-point residue when consuming millisecond input budgets.
const INPUT_BUDGET_EPSILON_MS = 0.0001;
// Retain the one-second allowance for queued timed movement before dropping stale controls.
const TIMED_INPUT_FRESHNESS_MS = 1000;
// Stop held directions after a quarter-second without fresh input.
const HELD_INPUT_FRESHNESS_MS = 250;

import type { Player } from '@emberfall/common';

import { movePlayer, TICK_MS } from '@emberfall/core';
export interface MovementInput {
  chatAt?: number;
  timed?: boolean;
  inputs: {
    seq: number;
    x: number;
    y: number;
    epoch?: string;
    durationMs?: number;
    elapsed?: number;
  }[];
  inputAt: number;
  lastSeq: number;
  epoch?: string;
  x: number;
  y: number;
}
/** Consume at most one fixed-tick budget, independent of packet/patch frequency. */
export function stepMovement(
  session: MovementInput,
  player: Player,
  sceneId: string | undefined,
  now: number,
  wallTime = now,
) {
  if (player.chat && wallTime - (session.chatAt ?? 0) >= CHAT_DISPLAY_MS) {
    player.chat = undefined;
  }

  if (session.timed) {
    let budget = TICK_MS;
    player.inputX = player.inputY = 0;
    while (budget > INPUT_BUDGET_EPSILON_MS && session.inputs.length) {
      const command = session.inputs[0];
      const epoch = player.scene === 'forest' ? sceneId : 'lobby';
      const elapsed = command.elapsed ?? 0;
      const dt = Math.min(budget, command.durationMs! - elapsed);

      if (command.epoch === epoch && now - session.inputAt <= TIMED_INPUT_FRESHNESS_MS) {
        movePlayer(player, command.x, command.y, dt / MILLISECONDS_PER_SECOND);
        player.inputX = command.x;
        player.inputY = command.y;
      }

      command.elapsed = elapsed + dt;
      player.inputSeq = command.seq;
      player.inputElapsed = command.elapsed;
      budget -= dt;

      if (command.elapsed >= command.durationMs! - INPUT_BUDGET_EPSILON_MS) {
        session.inputs.shift();
      }
    }

    return;
  }

  const command = session.inputs.shift();

  if (command) {
    player.inputSeq = command.seq;
  }

  const epoch = player.scene === 'forest' ? sceneId : 'lobby';

  if (command) {
    session.epoch = command.epoch;
    session.x = command.x;
    session.y = command.y;
  }

  const fresh =
    now - session.inputAt <= HELD_INPUT_FRESHNESS_MS &&
    (session.lastSeq === 0 || session.epoch === epoch);
  const x = fresh ? session.x : 0;
  const y = fresh ? session.y : 0;
  player.inputX = x;
  player.inputY = y;
  player.inputAt = now;
  movePlayer(player, x, y, TICK_MS / MILLISECONDS_PER_SECOND);
}
