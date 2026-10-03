import { movePlayer, TICK_MS, type Player } from "@emberfall/common-new";
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
  if (player.chat && wallTime - (session.chatAt ?? 0) >= 10_000) player.chat = undefined;
  if (session.timed) {
    let budget = TICK_MS;
    player.inputX = player.inputY = 0;
    while (budget > 0.0001 && session.inputs.length) {
      const command = session.inputs[0];
      const epoch = player.scene === "forest" ? sceneId : "lobby";
      const elapsed = command.elapsed ?? 0;
      const dt = Math.min(budget, command.durationMs! - elapsed);
      if (command.epoch === epoch && now - session.inputAt <= 1000) {
        movePlayer(player, command.x, command.y, dt / 1000);
        player.inputX = command.x;
        player.inputY = command.y;
      }
      command.elapsed = elapsed + dt;
      player.inputSeq = command.seq;
      player.inputElapsed = command.elapsed;
      budget -= dt;
      if (command.elapsed >= command.durationMs! - 0.0001) session.inputs.shift();
    }
    return;
  }
  const command = session.inputs.shift();
  if (command) player.inputSeq = command.seq;
  const epoch = player.scene === "forest" ? sceneId : "lobby";
  if (command) {
    session.epoch = command.epoch;
    session.x = command.x;
    session.y = command.y;
  }
  const fresh = now - session.inputAt <= 250 && (session.lastSeq === 0 || session.epoch === epoch);
  const x = fresh ? session.x : 0;
  const y = fresh ? session.y : 0;
  player.inputX = x;
  player.inputY = y;
  player.inputAt = now;
  movePlayer(player, x, y, TICK_MS / 1000);
}
