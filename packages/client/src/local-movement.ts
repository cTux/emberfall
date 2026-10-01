import { nearestEnemyAngle, smoothAttackAngle, PLAYER_ATTACK_INTERVAL } from "@emberfall/common";
import {
  FOREST,
  movePlayer,
  moveActor,
  moveForestActor,
  wrap,
  wrappedDelta,
} from "@emberfall/common";
import type { Player, WorldState, ClientMessage } from "@emberfall/common";

type Move = Extract<ClientMessage, { type: "move" }> & { seq: number; durationMs: number };
const TOLERANCE = 2,
  SNAP_DISTANCE = 20;

/** Replay only movement the server has not consumed; offsets affect drawing, never gameplay. */
export class LocalMovement {
  private source: WorldState | null = null;
  private base?: Player;
  private epoch = "";
  private pending: Move[] = [];
  private seq = 0;
  private at = 0;
  private unsent = 0;
  private x = 0;
  private y = 0;
  private offset = { x: 0, y: 0 };
  private drawnAt = 0;
  private attackAt = -Infinity;
  private sourceAt = 0;
  private attackAngle?: number;
  private aimAt?: number;
  private id: string;
  private send: (message: ClientMessage) => void;
  constructor(id: string, send: (message: ClientMessage) => void) {
    this.id = id;
    this.send = send;
  }

  private advance(now: number) {
    if (this.base) {
      const queued = this.pending.reduce((n, p) => n + p.durationMs, 0);
      this.unsent += Math.min(
        Math.max(0, now - this.at),
        100,
        Math.max(0, 1000 - queued - this.unsent),
      );
      while (this.unsent >= 50) this.flush(50);
    }
    this.at = now;
  }
  private flush(duration = this.unsent) {
    if (duration <= 0.0001 || !this.base) return;
    const command: Move = {
      type: "move",
      seq: ++this.seq,
      epoch: this.epoch,
      x: this.x,
      y: this.y,
      durationMs: duration,
    };
    this.unsent -= duration;
    this.pending.push(command);
    this.send(command);
  }
  input(x: number, y: number, now: number) {
    this.advance(now);
    this.flush();
    this.x = x;
    this.y = y;
  }
  private predict() {
    const player = { ...this.base! };
    for (const command of this.pending) {
      const elapsed =
        command.seq === player.inputSeq ? (player.inputElapsed ?? command.durationMs) : 0;
      movePlayer(player, command.x, command.y, Math.max(0, command.durationMs - elapsed) / 1000);
    }
    movePlayer(player, this.x, this.y, this.unsent / 1000);
    return player;
  }
  private difference(a: { x: number; y: number }, b: { x: number; y: number }) {
    return this.base?.scene === "forest"
      ? { x: wrappedDelta(a.x, b.x, FOREST.width), y: wrappedDelta(a.y, b.y, FOREST.height) }
      : { x: a.x - b.x, y: a.y - b.y };
  }
  render(world: WorldState, now: number): Player | undefined {
    this.advance(now);
    const authoritative = world.players.find((p) => p.id === this.id);
    if (!authoritative) return;
    const epoch = authoritative.scene === "forest" ? world.scene!.id : "lobby";
    if (
      !this.base ||
      epoch !== this.epoch ||
      world.id !== this.source?.id ||
      authoritative.hitpoints <= 0 !== this.base.hitpoints <= 0
    ) {
      this.pending = [];
      this.unsent = 0;
      this.offset = { x: 0, y: 0 };
      this.epoch = epoch;
      this.base = { ...authoritative };
      this.source = world;
      this.sourceAt = now;
      this.attackAt = -Infinity;
      this.attackAngle = undefined;
      this.aimAt = undefined;
    } else if (world !== this.source && (world.serverNow ?? 0) >= (this.source?.serverNow ?? 0)) {
      const before = this.predict();
      this.source = world;
      this.sourceAt = now;
      this.base = { ...authoritative };
      this.pending = this.pending.filter(
        (p) =>
          p.seq > (authoritative.inputSeq ?? 0) ||
          (p.seq === authoritative.inputSeq &&
            (authoritative.inputElapsed ?? Infinity) < p.durationMs - 0.0001),
      );
      const after = this.predict();
      const error = this.difference(before, after);
      this.offset.x += error.x;
      this.offset.y += error.y;
      if (Math.hypot(this.offset.x, this.offset.y) > SNAP_DISTANCE) this.offset = { x: 0, y: 0 };
    }
    const predicted = this.predict();
    const dt = Math.min(100, Math.max(0, now - this.drawnAt));
    this.drawnAt = now;
    const distance = Math.hypot(this.offset.x, this.offset.y);
    // Leave tiny errors visually alone; larger accumulated error converges smoothly.
    if (distance > TOLERANCE) {
      const decay = Math.exp(-dt / 120);
      this.offset.x *= decay;
      this.offset.y *= decay;
    }
    const point = (predicted.scene === "forest" ? moveForestActor : moveActor)(
      { x: predicted.x, y: predicted.y + 15 },
      this.offset.x,
      this.offset.y,
      12,
    );
    const displayed = {
      x: point.x,
      y: predicted.scene === "forest" ? wrap(point.y - 15, FOREST.height) : point.y - 15,
    };
    this.offset = this.difference(displayed, predicted);
    const probe = { ...predicted };
    movePlayer(probe, this.x, this.y, 1 / 60);
    const motion = this.difference(probe, predicted);
    return { ...predicted, ...displayed, inputX: motion.x, inputY: motion.y };
  }
  animateAttack(player: Player, world: WorldState, now: number) {
    if (player.scene !== "forest" || player.hitpoints <= 0 || world.scene?.phase !== "active")
      return false;
    // Aim follows the visible nearest target every frame, independently of the swing cooldown.
    this.attackAngle = smoothAttackAngle(
      this.attackAngle,
      nearestEnemyAngle(player, world.scene.enemies, this.attackAngle),
      this.aimAt === undefined ? 0 : (now - this.aimAt) / 1000,
    );
    this.aimAt = now;
    const serverNow = (this.source?.serverNow ?? 0) + now - this.sourceAt;
    const origin = this.base?.attackAt ?? this.source?.serverNow ?? 0;
    const cycle =
      origin +
      Math.floor(Math.max(0, serverNow - origin) / PLAYER_ATTACK_INTERVAL) * PLAYER_ATTACK_INTERVAL;
    const started = cycle !== this.attackAt;
    this.attackAt = cycle;
    player.attackAt = now - (serverNow - cycle);
    player.attackAngle = this.attackAngle;
    return started;
  }
}
