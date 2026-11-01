import {
  MILLISECONDS_PER_SECOND,
  wrap,
  wrappedDelta,
  type Player,
  type WorldState,
  type ClientMessage,
} from '@emberfall/common';
import { FOREST, moveActor, moveForestActor, movePlayer } from '@emberfall/core';
import { LocalAttacks } from './local-attacks.ts';
import { PREDICTION_LIMIT_MS } from './prediction-frame.ts';

// Existing reconciliation calibration tolerates two-pixel noise, snaps beyond 20 pixels,
// and otherwise decays correction over 120 ms; these are presentation choices, not server movement rules.
const RECONCILIATION = {
  maxStepMs: 100,
  commandMs: 50,
  timeEpsilonMs: 0.0001,
  decayMs: 120,
  footOffset: 15,
  collisionRadius: 12,
  probeFps: 60,
} as const;

type Move = Extract<ClientMessage, { type: 'move' }> & {
  seq: number;
  durationMs: number;
  sentAt: number;
};
// Two pixels hide subpixel jitter without accumulating a visibly displaced actor.
const TOLERANCE = 2,
  // Twenty pixels retains the existing teleport-like correction cutoff.
  SNAP_DISTANCE = 20;

/** Replay only movement the server has not consumed; offsets affect drawing, never gameplay. */
export class LocalMovement {
  private source: WorldState | null = null;
  private base?: Player;
  private epoch = '';
  private pending: Move[] = [];
  private seq = 0;
  private at = 0;
  private unsent = 0;
  private x = 0;
  private y = 0;
  private offset = { x: 0, y: 0 };
  private drawnAt = 0;
  private sourceAt = 0;
  private acknowledgedDelay: number | null = null;
  private attacks: LocalAttacks;
  private id: string;
  private send: (message: ClientMessage) => void;

  constructor(id: string, send: (message: ClientMessage) => void) {
    this.attacks = new LocalAttacks(send);
    this.id = id;
    this.send = send;
  }

  private advance(now: number) {
    // RAF's timestamp can predate an input handler's performance.now(). Never
    // rewind this clock or the next frame predicts/sends the same time twice.
    const elapsed = Math.max(0, now - this.at);
    this.at = Math.max(this.at, now);

    if (this.base) {
      const queued = this.pending.reduce((n, p) => {
        return n + p.durationMs;
      }, 0);
      this.unsent += Math.min(
        Math.max(0, elapsed),
        RECONCILIATION.maxStepMs,
        Math.max(0, PREDICTION_LIMIT_MS - queued - this.unsent),
      );
      while (this.unsent >= RECONCILIATION.commandMs) {
        this.flush(RECONCILIATION.commandMs);
      }
    }
  }

  private flush(duration = this.unsent) {
    if (duration <= RECONCILIATION.timeEpsilonMs || !this.base) {
      return;
    }

    const command: Move = {
      type: 'move',
      seq: ++this.seq,
      epoch: this.epoch,
      x: this.x,
      y: this.y,
      durationMs: duration,
      sentAt: this.at,
    };
    this.unsent -= duration;
    this.pending.push(command);
    const { sentAt: _, ...message } = command;
    this.send(message);
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
      movePlayer(
        player,
        command.x,
        command.y,
        Math.max(0, command.durationMs - elapsed) / MILLISECONDS_PER_SECOND,
      );
    }

    movePlayer(player, this.x, this.y, this.unsent / MILLISECONDS_PER_SECOND);

    return player;
  }

  private difference(a: { x: number; y: number }, b: { x: number; y: number }) {
    return { x: wrappedDelta(a.x, b.x, FOREST.width), y: wrappedDelta(a.y, b.y, FOREST.height) };
  }

  render(world: WorldState, now: number): Player | undefined {
    this.advance(now);
    const authoritative = world.players.find((p) => {
      return p.id === this.id;
    });

    if (!authoritative) {
      return;
    }

    const epoch = authoritative.scene === 'forest' ? world.scene!.id : 'lobby';

    if (
      !this.base ||
      epoch !== this.epoch ||
      world.id !== this.source?.id ||
      authoritative.classId !== this.base.classId ||
      authoritative.hitpoints <= 0 !== this.base.hitpoints <= 0
    ) {
      this.pending = [];
      this.unsent = 0;
      this.offset = { x: 0, y: 0 };
      this.epoch = epoch;
      this.base = { ...authoritative };
      this.source = world;
      this.sourceAt = now;
      this.attacks.reset({ world, player: this.base, epoch, receivedAt: now });
      this.acknowledgedDelay = null;
    } else if (world !== this.source && (world.serverNow ?? 0) >= (this.source?.serverNow ?? 0)) {
      const before = this.predict();
      this.source = world;
      this.sourceAt = now;
      this.base = { ...authoritative };
      this.attacks.confirm({ world, player: this.base, epoch, receivedAt: now });
      const acknowledged = this.pending.find((p) => {
        return p.seq === authoritative.inputSeq;
      });

      if (acknowledged) {
        this.acknowledgedDelay = Math.max(0, now - acknowledged.sentAt);
      }

      this.pending = this.pending.filter((p) => {
        return (
          p.seq > (authoritative.inputSeq ?? 0) ||
          (p.seq === authoritative.inputSeq &&
            (authoritative.inputElapsed ?? Infinity) < p.durationMs - RECONCILIATION.timeEpsilonMs)
        );
      });
      const after = this.predict();
      const error = this.difference(before, after);
      this.offset.x += error.x;
      this.offset.y += error.y;

      if (Math.hypot(this.offset.x, this.offset.y) > SNAP_DISTANCE) {
        this.offset = { x: 0, y: 0 };
      }
    }

    const predicted = this.predict();
    const dt = Math.min(RECONCILIATION.maxStepMs, Math.max(0, now - this.drawnAt));
    this.drawnAt = now;
    const distance = Math.hypot(this.offset.x, this.offset.y);

    // Leave tiny errors visually alone; larger accumulated error converges smoothly.
    if (distance > TOLERANCE) {
      const decay = Math.exp(-dt / RECONCILIATION.decayMs);
      this.offset.x *= decay;
      this.offset.y *= decay;
    }

    const point = (predicted.scene === 'forest' ? moveForestActor : moveActor)(
      { x: predicted.x, y: predicted.y + RECONCILIATION.footOffset },
      this.offset.x,
      this.offset.y,
      RECONCILIATION.collisionRadius,
      false,
    );
    const displayed = {
      x: point.x,
      y: wrap(point.y - RECONCILIATION.footOffset, FOREST.height),
    };
    this.offset = this.difference(displayed, predicted);
    const probe = { ...predicted };

    if (now - this.sourceAt <= PREDICTION_LIMIT_MS) {
      movePlayer(probe, this.x, this.y, 1 / RECONCILIATION.probeFps);
    }

    const motion = this.difference(probe, predicted);

    return { ...predicted, ...displayed, inputX: motion.x, inputY: motion.y };
  }

  animateAttack(player: Player, world: WorldState, now: number) {
    return this.attacks.animateAttack(player, world, now);
  }

  animateProjectiles(player: Player, world: WorldState, now: number, started: boolean) {
    this.attacks.animateProjectiles(player, world, now, started);
  }

  inputDelay(now: number) {
    return this.pending.length
      ? Math.max(this.acknowledgedDelay ?? 0, now - this.pending[0].sentAt)
      : this.acknowledgedDelay;
  }
}
