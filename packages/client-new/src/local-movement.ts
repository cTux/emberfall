import {
  playerAimAngle,
  smoothAttackAngle,
  PLAYER_ATTACK_INTERVAL,
  inTrainingZone,
  fireClassAttack,
  advancePlayerShot,
} from "@emberfall/common-new";
import {
  FOREST,
  movePlayer,
  moveActor,
  moveForestActor,
  wrap,
  wrappedDelta,
} from "@emberfall/common-new";
import type { Player, PlayerShot, WorldState, ClientMessage } from "@emberfall/common-new";

type Move = Extract<ClientMessage, { type: "move" }> & {
  seq: number;
  durationMs: number;
  sentAt: number;
};
const TOLERANCE = 2,
  SNAP_DISTANCE = 20,
  PREDICTION_LIMIT_MS = 1000;

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
  private attackId?: number;
  private castSeq = 0;
  private requestAt = -Infinity;
  private casts = new Map<number, number>();
  private shots: PlayerShot[] = [];
  private shotCastAt = -Infinity;
  private shotsAt = 0;
  private sourceAt = 0;
  private attackAngle?: number;
  private aimAt?: number;
  private acknowledgedDelay: number | null = null;
  private id: string;
  private send: (message: ClientMessage) => void;
  constructor(id: string, send: (message: ClientMessage) => void) {
    this.id = id;
    this.send = send;
  }

  private advance(now: number) {
    const elapsed = now - this.at;
    this.at = now;
    if (this.base) {
      const queued = this.pending.reduce((n, p) => n + p.durationMs, 0);
      this.unsent += Math.min(
        Math.max(0, elapsed),
        100,
        Math.max(0, PREDICTION_LIMIT_MS - queued - this.unsent),
      );
      while (this.unsent >= 50) this.flush(50);
    }
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
      movePlayer(player, command.x, command.y, Math.max(0, command.durationMs - elapsed) / 1000);
    }
    movePlayer(player, this.x, this.y, this.unsent / 1000);
    return player;
  }
  private difference(a: { x: number; y: number }, b: { x: number; y: number }) {
    return { x: wrappedDelta(a.x, b.x, FOREST.width), y: wrappedDelta(a.y, b.y, FOREST.height) };
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
      this.attackAt = -Infinity;
      this.attackId = undefined;
      this.castSeq = Math.max(this.castSeq, authoritative.castSeq ?? 0);
      this.casts.clear();
      this.requestAt = -Infinity;
      this.shots = [];
      this.shotCastAt = -Infinity;
      this.shotsAt = now;
      this.attackAngle = undefined;
      this.aimAt = undefined;
      this.acknowledgedDelay = null;
    } else if (world !== this.source && (world.serverNow ?? 0) >= (this.source?.serverNow ?? 0)) {
      const before = this.predict();
      this.source = world;
      this.sourceAt = now;
      this.base = { ...authoritative };
      const shots =
        authoritative.scene === "forest" ? world.scene?.playerShots : world.training?.playerShots;
      for (const id of this.casts.keys()) {
        if (
          id <= (authoritative.castSeq ?? 0) &&
          id !== authoritative.attackId &&
          !shots?.some((s) => s.ownerId === this.id && s.castId === id)
        ) {
          this.casts.delete(id);
          this.shots = this.shots.filter((s) => s.castId !== id);
          if (this.attackId === id) {
            this.attackId = authoritative.attackId;
            this.attackAt = authoritative.attackAt ?? -Infinity;
          }
        }
      }
      const acknowledged = this.pending.find((p) => p.seq === authoritative.inputSeq);
      if (acknowledged) this.acknowledgedDelay = Math.max(0, now - acknowledged.sentAt);
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
      false,
    );
    const displayed = {
      x: point.x,
      y: wrap(point.y - 15, FOREST.height),
    };
    this.offset = this.difference(displayed, predicted);
    const probe = { ...predicted };
    if (now - this.sourceAt <= PREDICTION_LIMIT_MS) movePlayer(probe, this.x, this.y, 1 / 60);
    const motion = this.difference(probe, predicted);
    return { ...predicted, ...displayed, inputX: motion.x, inputY: motion.y };
  }
  animateAttack(player: Player, world: WorldState, now: number) {
    const scene = player.scene === "forest" ? world.scene : world.training;
    if (
      player.hitpoints <= 0 ||
      scene?.phase !== "active" ||
      scene.pausedAt !== undefined ||
      now - this.sourceAt > PREDICTION_LIMIT_MS ||
      (!player.scene && !inTrainingZone(player))
    ) {
      player.attackAt = undefined;
      this.attackAt = -Infinity;
      this.aimAt = undefined;
      return false;
    }
    // Aim follows the selected control mode independently of the cast cooldown.
    this.attackAngle = smoothAttackAngle(
      this.attackAngle,
      playerAimAngle({ ...player, attackAngle: this.attackAngle }, scene.enemies),
      this.aimAt === undefined ? 0 : (now - this.aimAt) / 1000,
    );
    this.aimAt = now;
    const serverNow = (this.source?.serverNow ?? 0) + now - this.sourceAt;
    let started = false;
    if (player.autoAttack === false) {
      if (!Number.isFinite(this.attackAt)) {
        this.attackAt = this.base?.attackAt ?? -Infinity;
        this.attackId = this.base?.attackId;
      }
      const confirmedAt =
        this.base?.attackAt === undefined ? -Infinity : now - (serverNow - this.base.attackAt);
      const origin = Math.max(confirmedAt, this.requestAt);
      if (player.attacking && now - origin >= PLAYER_ATTACK_INTERVAL) {
        this.attackAt = serverNow;
        this.requestAt = now;
        this.attackId = ++this.castSeq;
        this.casts.set(this.attackId, now);
        // Keep completed IDs briefly so delayed confirmation cannot replay an expired visual.
        if (this.casts.size > 32) this.casts.delete(this.casts.keys().next().value!);
        this.send({
          type: "cast",
          id: this.attackId,
          epoch: this.epoch,
          classId: player.classId ?? "warrior",
          autoTarget: player.autoTarget !== false,
          aimX: player.aimX ?? player.x,
          aimY: player.aimY ?? player.y,
        });
        started = true;
      }
    } else {
      // Automatic attacks belong to the server clock. Entering a combat area
      // before its first attack snapshot must not invent a swing that confirmation restarts.
      const origin = this.base?.attackAt;
      if (origin === undefined) {
        player.attackAt = undefined;
        this.attackAt = -Infinity;
        this.attackId = undefined;
        return false;
      }
      const cycle =
        origin +
        Math.floor(Math.max(0, serverNow - origin) / PLAYER_ATTACK_INTERVAL) *
          PLAYER_ATTACK_INTERVAL;
      started = cycle !== this.attackAt;
      this.attackAt = cycle;
      this.attackId = undefined;
    }
    const cycle = this.attackAt;
    player.attackId = this.attackId;
    player.attackAt =
      this.attackId !== undefined && this.casts.has(this.attackId)
        ? this.casts.get(this.attackId)
        : Number.isFinite(cycle)
          ? now - (serverNow - cycle)
          : undefined;
    player.attackAngle = this.attackAngle;
    return started;
  }
  animateProjectiles(player: Player, world: WorldState, now: number, started: boolean) {
    const scene = player.scene === "forest" ? world.scene : world.training;
    const confirmed = player.scene === "forest" ? this.source?.scene : this.source?.training;
    const dt = Math.min(100, Math.max(0, now - this.shotsAt)) / 1000;
    this.shotsAt = now;
    if (!scene) {
      this.shots = [];
      return;
    }
    if (
      player.hitpoints <= 0 ||
      scene.phase !== "active" ||
      scene.pausedAt !== undefined ||
      (player.classId !== "mage" && player.classId !== "ranger" && player.classId !== "druid") ||
      now - this.sourceAt > PREDICTION_LIMIT_MS
    ) {
      this.shots = [];
    } else {
      // Confirm targets and retire completed/rejected casts without replaying delayed spawns.
      const matched = new Set<number>();
      this.shots = this.shots.filter((shot) => {
        const acknowledged =
          shot.castId !== undefined
            ? (this.base?.castSeq ?? 0) >= shot.castId &&
              (this.source?.serverNow ?? 0) >= (this.base?.attackAt ?? 0)
            : (this.source?.serverNow ?? 0) >= shot.castAt!;
        if (acknowledged) {
          const candidates = confirmed?.playerShots?.filter(
            (s) =>
              s.ownerId === player.id &&
              (shot.castId !== undefined ? s.castId === shot.castId : s.castAt === shot.castAt) &&
              !matched.has(s.id),
          );
          const serverShot =
            candidates?.find((s) => s.targetId === shot.targetId) ?? candidates?.[0];
          if (!serverShot) return false;
          matched.add(serverShot.id);
          shot.id = serverShot.id;
          shot.targetId = serverShot.targetId;
          shot.targetX = serverShot.targetX;
          shot.targetY = serverShot.targetY;
          shot.angle = serverShot.angle;
        }
        return !advancePlayerShot(shot, scene.enemies, dt) && shot.remaining > 0.001;
      });
      if (started && player.attackAt !== undefined && now - player.attackAt < 100) {
        const cast = { ...scene, sequence: 0, playerShots: [] as PlayerShot[] };
        fireClassAttack(cast, { ...player, attackAt: this.attackAt });
        this.shots.push(...cast.playerShots);
        if (cast.playerShots.length) this.shotCastAt = this.attackAt;
      }
      // A target absent from our snapshots cannot be predicted. Launch that server cast here too.
      const missed =
        confirmed?.playerShots?.filter(
          (s) =>
            s.ownerId === player.id &&
            s.castAt !== undefined &&
            s.castAt > this.shotCastAt &&
            (s.castId === undefined || !this.casts.has(s.castId)),
        ) ?? [];
      for (const shot of missed)
        this.shots.push({ ...shot, x: player.x, y: player.y, hitIds: [...shot.hitIds] });
      if (missed.length) this.shotCastAt = Math.max(...missed.map((s) => s.castAt!));
    }
    // Only replace our projectiles; other players retain snapshot interpolation.
    scene.playerShots = [
      ...(scene.playerShots ?? []).filter((s) => s.ownerId !== player.id),
      ...this.shots.map((s) => ({ ...s })),
    ];
  }
  inputDelay(now: number) {
    return this.pending.length
      ? Math.max(this.acknowledgedDelay ?? 0, now - this.pending[0].sentAt)
      : this.acknowledgedDelay;
  }
}
