import {
  FOREST,
  wrappedDelta,
  wrap,
  moveActor,
  moveForestActor,
  ENEMY_STATS,
} from "@emberfall/common-new";
import type { WorldState } from "@emberfall/common-new";

/** Interpolate confirmed states on a monotonic clock. No input prediction or rollback. */
export class SnapshotBuffer {
  private history: WorldState[] = [];
  private latest: WorldState | null = null;
  private epoch = "";
  private clock = 0;
  private renderedAt = 0;
  private receivedAt = 0;
  private playerId: string;
  constructor(playerId: string) {
    this.playerId = playerId;
  }

  push(world: WorldState, now: number) {
    if (world === this.latest) return;
    const me = world.players.find((p) => p.id === this.playerId);
    const epoch = `${world.id}:${me?.scene === "forest" ? world.scene?.id : "lobby"}`;
    const time = world.serverNow ?? 0;
    if (epoch !== this.epoch) {
      this.history = [];
      this.clock = time - 100;
      this.renderedAt = now;
      this.epoch = epoch;
    } else if (time < (this.latest?.serverNow ?? 0)) return;
    this.latest = world;
    this.receivedAt = now;
    // Replace duplicate timestamps rather than creating a zero-length interpolation segment.
    if (this.history.at(-1)?.serverNow === world.serverNow) this.history.pop();
    this.history.push(world);
    if (this.history.length > 20) this.history.shift();
  }

  render(now: number): WorldState | null {
    if (!this.latest) return null;
    const newest = this.latest.serverNow ?? 0;
    const elapsed = Math.max(0, now - this.renderedAt);
    this.renderedAt = now;
    const lag = newest - this.clock;
    // Gently recover buffer depth instead of resetting the camera clock on each packet.
    const rate = lag > 150 ? 1.1 : lag < 50 ? 0.9 : 1;
    this.clock = Math.min(newest, this.clock + elapsed * rate);
    if (this.history.length === 20)
      this.clock = Math.max(this.history[0].serverNow ?? 0, this.clock);
    const older = this.history.findLast((s) => (s.serverNow ?? 0) <= this.clock) ?? this.history[0];
    const newer = this.history.find((s) => (s.serverNow ?? 0) >= this.clock) ?? this.latest;
    const span = (newer.serverNow ?? 0) - (older.serverNow ?? 0);
    const alpha = span > 0 ? (this.clock - (older.serverNow ?? 0)) / span : 1;
    const interpolate = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      forest: boolean,
      radius: number,
      collide = true,
    ) => {
      const dx = wrappedDelta(b.x, a.x, FOREST.width);
      const dy = wrappedDelta(b.y, a.y, FOREST.height);
      if (Math.hypot(dx, dy) > 96) return { ...b, dx: 0, dy: 0 };
      const point = (forest ? moveForestActor : moveActor)(
        { x: a.x, y: a.y + 15 },
        dx * alpha,
        dy * alpha,
        radius,
        collide,
      );
      return { x: point.x, y: wrap(point.y - 15, FOREST.height), dx, dy };
    };
    const players = older.players.map((a) => {
      const b = newer.players.find((p) => p.id === a.id);
      if (!b || a.scene !== b.scene) return { ...a, inputX: 0, inputY: 0 };
      const point = interpolate(a, b, a.scene === "forest", 12, false);
      // Corrections with no movement intent must not trigger a walking animation.
      return {
        ...a,
        bear: a.bear ? { ...a.bear } : undefined,
        x: point.x,
        y: point.y,
        inputX: b.inputX ? point.dx : 0,
        inputY: b.inputY ? point.dy : 0,
      };
    });
    const scene = older.scene
      ? {
          ...older.scene,
          enemies: older.scene.enemies.map((e) => ({ ...e })),
          playerShots: older.scene.playerShots?.map((p) => ({ ...p })),
          drops: older.scene.drops?.map((d) => ({ ...d })),
          projectiles: older.scene.projectiles?.map((p) => ({ ...p })),
        }
      : undefined;
    if (scene && scene.id === newer.scene?.id) {
      const enemies = new Map(newer.scene.enemies.map((e) => [e.id, e]));
      for (const enemy of scene.enemies) {
        const b = enemies.get(enemy.id);
        if (!b) continue;
        const point = interpolate(
          enemy,
          b,
          true,
          ENEMY_STATS[enemy.archetype ?? "skeleton"].radius,
        );
        enemy.x = point.x;
        enemy.y = point.y;
        if (Math.hypot(point.dx, point.dy) > 0.001) enemy.angle = Math.atan2(point.dy, point.dx);
      }
      const drops = new Map(newer.scene.drops?.map((d) => [d.id, d]));
      for (const drop of scene.drops ?? []) {
        const next = drops.get(drop.id);
        if (!next) continue;
        drop.x = wrap(drop.x + wrappedDelta(next.x, drop.x, FOREST.width) * alpha, FOREST.width);
        drop.y = wrap(drop.y + wrappedDelta(next.y, drop.y, FOREST.height) * alpha, FOREST.height);
      }
      const friendlyShots = new Map(newer.scene.playerShots?.map((p) => [p.id, p]));
      for (const shot of scene.playerShots ?? []) {
        const next = friendlyShots.get(shot.id);
        if (!next) continue;
        shot.x = wrap(shot.x + wrappedDelta(next.x, shot.x, FOREST.width) * alpha, FOREST.width);
        shot.y = wrap(shot.y + wrappedDelta(next.y, shot.y, FOREST.height) * alpha, FOREST.height);
      }
      const shots = new Map(newer.scene.projectiles?.map((p) => [p.id, p]));
      for (const shot of scene.projectiles ?? []) {
        const b = shots.get(shot.id);
        if (!b) continue;
        shot.x = wrap(shot.x + wrappedDelta(b.x, shot.x, FOREST.width) * alpha, FOREST.width);
        shot.y = wrap(shot.y + wrappedDelta(b.y, shot.y, FOREST.height) * alpha, FOREST.height);
      }
    }
    for (const player of players) {
      const next = newer.players.find((p) => p.id === player.id)?.bear;
      if (!player.bear || !next || player.bear.hitpoints <= 0 || next.hitpoints <= 0) continue;
      const point = interpolate(player.bear, next, player.scene === "forest", 8);
      player.bear.x = point.x;
      player.bear.y = point.y;
      player.bear.moving = Math.hypot(point.dx, point.dy) > 0.001;
    }
    const training = older.training
      ? { ...older.training, playerShots: older.training.playerShots?.map((p) => ({ ...p })) }
      : undefined;
    return { ...older, players, scene, training, serverNow: this.clock };
  }
  age(now: number) {
    return this.latest
      ? Math.max(0, now - this.receivedAt) + Math.max(0, (this.latest.serverNow ?? 0) - this.clock)
      : null;
  }
}
