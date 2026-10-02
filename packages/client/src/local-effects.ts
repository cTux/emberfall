import { fireClassAttack } from "../../common/src/class-combat.ts";
import { FOREST, forestDistance, wrap, wrappedDelta } from "@emberfall/common";
import type { LootDrop, Player, PlayerShot, WorldState } from "@emberfall/common";

/** Presentation only: never simulate hits, explosions, rewards or enemy health. */
export class LocalEffects {
  private epoch = "";
  private at = 0;
  private shots = new Map<
    string,
    { shot: PlayerShot; confirmed?: number; updatedAt?: number; errorX: number; errorY: number }
  >();
  private drops = new Map<number, { drop: LootDrop; missingAt?: number }>();
  private collected = new Set<number>();

  render(
    view: WorldState,
    latest: WorldState,
    player: Player,
    swing: boolean,
    attackAt: number,
    now: number,
  ) {
    const epoch = `${latest.id}:${latest.scene?.id}:${player.scene}:${player.hitpoints > 0}`;
    if (epoch !== this.epoch) {
      this.shots.clear();
      this.drops.clear();
      this.collected.clear();
      this.epoch = epoch;
      this.at = now;
    }
    const dt = Math.min(100, Math.max(0, now - this.at)) / 1000;
    this.at = now;
    if (!view.scene || !latest.scene || player.scene !== "forest" || player.hitpoints <= 0) return;
    const key = (shot: PlayerShot) => `${shot.attackAt}:${shot.volleyIndex ?? 0}`;
    const confirmed = new Map(
      (latest.scene.playerShots ?? [])
        .filter((s) => s.ownerId === player.id)
        .map((s) => [key(s), s]),
    );
    const born = new Set<string>();
    if (
      swing &&
      latest.scene.phase === "active" &&
      (player.classId === "ranger" || player.classId === "mage")
    ) {
      const scene = { ...view.scene, playerShots: [] as PlayerShot[] };
      fireClassAttack(scene, { ...player, attackAt }, attackAt);
      for (const shot of scene.playerShots) {
        if (!this.shots.has(key(shot))) {
          this.shots.set(key(shot), { shot, errorX: 0, errorY: 0 });
          born.add(key(shot));
        }
      }
    }
    for (const [id, server] of confirmed) {
      if (!this.shots.has(id)) {
        if (swing && server.attackAt === attackAt) {
          this.shots.set(id, {
            shot: { ...server, x: player.x, y: player.y },
            errorX: 0,
            errorY: 0,
          });
          born.add(id);
          continue;
        }
        this.shots.set(id, { shot: { ...server }, confirmed: server.id, errorX: 0, errorY: 0 });
      }
    }
    for (const [id, visual] of this.shots) {
      const server = confirmed.get(id);
      const shot = visual.shot;
      if (server) {
        if (visual.confirmed === undefined || latest.serverNow !== visual.updatedAt) {
          visual.errorX = wrappedDelta(shot.x + visual.errorX, server.x, FOREST.width);
          visual.errorY = wrappedDelta(shot.y + visual.errorY, server.y, FOREST.height);
          Object.assign(shot, server);
          visual.updatedAt = latest.serverNow;
        }
        visual.confirmed = server.id;
        const decay = born.has(id) ? 1 : Math.exp(-dt / 0.12);
        visual.errorX *= decay;
        visual.errorY *= decay;
      } else if (
        visual.confirmed !== undefined ||
        (latest.serverNow ?? 0) > (shot.attackAt ?? 0) + 350
      ) {
        this.shots.delete(id);
        continue;
      }
      if (shot.kind === "fireball") {
        const target = view.scene.enemies.find((e) => e.id === shot.targetId && e.hitpoints > 0);
        shot.angle = Math.atan2(
          wrappedDelta(target?.y ?? shot.targetY ?? shot.y, shot.y, FOREST.height),
          wrappedDelta(target?.x ?? shot.targetX ?? shot.x, shot.x, FOREST.width),
        );
      }
      const distance = Math.min(shot.remaining, dt * (shot.kind === "arrow" ? 600 : 380));
      // A new predicted shot starts at the displayed player this frame.
      if (!born.has(id)) {
        shot.x = wrap(shot.x + Math.cos(shot.angle) * distance, FOREST.width);
        shot.y = wrap(shot.y + Math.sin(shot.angle) * distance, FOREST.height);
        shot.remaining -= distance;
      }
      if (shot.remaining <= 0 && visual.confirmed === undefined) this.shots.delete(id);
    }
    view.scene.playerShots = [
      ...(view.scene.playerShots ?? []).filter((s) => s.ownerId !== player.id),
      ...[...this.shots.values()]
        .filter(({ shot }) => shot.remaining > 0)
        .map(({ shot, errorX, errorY }) => ({
          ...shot,
          x: wrap(shot.x + errorX, FOREST.width),
          y: wrap(shot.y + errorY, FOREST.height),
        })),
    ];

    const liveDrops = new Map((latest.scene.drops ?? []).map((d) => [d.id, d]));
    const visibleDrops = new Map((view.scene.drops ?? []).map((d) => [d.id, d]));
    for (const id of this.collected) {
      const live = liveDrops.get(id);
      if (live && live.collectorId !== player.id) this.collected.delete(id);
    }
    // Only server-selected attraction is presented ahead of the buffered scene.
    for (const drop of liveDrops.values()) {
      if (
        drop.collectorId === player.id &&
        !this.collected.has(drop.id) &&
        !this.drops.has(drop.id)
      )
        this.drops.set(drop.id, {
          drop: { ...(visibleDrops.get(drop.id) ?? drop), collectorId: player.id },
        });
    }
    for (const [id, visual] of this.drops) {
      const live = liveDrops.get(id);
      if (live && live.collectorId !== player.id) {
        this.drops.delete(id);
        continue;
      }
      if (!live) visual.missingAt ??= now;
      const drop = visual.drop;
      const distance = forestDistance(player, drop);
      const travel = Math.min(distance, 280 * dt);
      if (distance <= 22 || (visual.missingAt !== undefined && now - visual.missingAt > 1000)) {
        this.drops.delete(id);
        this.collected.add(id);
        continue;
      }
      drop.x = wrap(
        drop.x + (wrappedDelta(player.x, drop.x, FOREST.width) * travel) / distance,
        FOREST.width,
      );
      drop.y = wrap(
        drop.y + (wrappedDelta(player.y, drop.y, FOREST.height) * travel) / distance,
        FOREST.height,
      );
    }
    // Release tombstones after both authoritative and buffered snapshots forget the drop.
    for (const id of this.collected)
      if (!liveDrops.has(id) && !visibleDrops.has(id)) this.collected.delete(id);
    view.scene.drops = [
      ...(view.scene.drops ?? []).filter((d) => !this.drops.has(d.id) && !this.collected.has(d.id)),
      ...[...this.drops.values()].map((v) => ({ ...v.drop })),
    ];
  }
}
