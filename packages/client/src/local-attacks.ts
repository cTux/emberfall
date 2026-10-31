import type { Player, WorldState, ClientMessage } from '@emberfall/common';
import {
  game,
  characterStats,
  inTrainingZone,
  playerAimAngle,
  smoothAttackAngle,
  nearestSpellTarget,
} from '@emberfall/core';
import { LocalProjectiles } from './local-projectiles.ts';
import { PREDICTION_LIMIT_MS, type ConfirmedFrame } from './prediction-frame.ts';

export class LocalAttacks {
  private attackAt = -Infinity;
  private attackId?: number;
  private castSeq = 0;
  private requestAt = -Infinity;
  private casts = new Map<number, number>();
  private attackAngle?: number;
  private aimAt?: number;
  private frame!: ConfirmedFrame;
  private projectiles = new LocalProjectiles();
  private send: (message: ClientMessage) => void;

  constructor(send: (message: ClientMessage) => void) {
    this.send = send;
  }

  reset(frame: ConfirmedFrame) {
    this.frame = frame;
    this.attackAt = -Infinity;
    this.attackId = undefined;
    this.castSeq = Math.max(this.castSeq, frame.player.castSeq ?? 0);
    this.casts.clear();
    this.requestAt = -Infinity;
    this.projectiles.reset(frame.receivedAt);
    this.attackAngle = undefined;
    this.aimAt = undefined;
  }

  confirm(frame: ConfirmedFrame) {
    this.frame = frame;
    const authoritative = frame.player;
    const shots =
      authoritative.scene === 'forest'
        ? frame.world.scene?.playerShots
        : frame.world.training?.playerShots;
    for (const id of this.casts.keys()) {
      if (
        id <= (authoritative.castSeq ?? 0) &&
        id !== authoritative.attackId &&
        !shots?.some((s) => s.ownerId === authoritative.id && s.castId === id)
      ) {
        this.casts.delete(id);
        this.projectiles.reject(id);
        if (this.attackId === id) {
          this.attackId = authoritative.attackId;
          this.attackAt = authoritative.attackAt ?? -Infinity;
        }
      }
    }
  }

  animateAttack(player: Player, world: WorldState, now: number) {
    const scene = player.scene === 'forest' ? world.scene : world.training;
    const stats = characterStats(player);
    if (
      !stats.hasWeapon ||
      player.hitpoints <= 0 ||
      scene?.phase !== 'active' ||
      scene.pausedAt !== undefined ||
      now - this.frame.receivedAt > PREDICTION_LIMIT_MS ||
      (!player.scene && !inTrainingZone(player))
    ) {
      player.attackAt = undefined;
      this.attackAt = -Infinity;
      this.aimAt = undefined;

      return false;
    }

    // Aim follows the selected control mode independently of the cast cooldown.
    const ability = game.registries.abilities.require(
      game.registries.classes.require(player.classId ?? 'warrior').attack,
    );
    this.attackAngle = smoothAttackAngle(
      this.attackAngle,
      playerAimAngle({ ...player, attackAngle: this.attackAngle }, scene.enemies),
      this.aimAt === undefined ? 0 : (now - this.aimAt) / 1000,
      ability.aimSmoothingSeconds,
    );
    this.aimAt = now;
    const serverNow = (this.frame.world.serverNow ?? 0) + now - this.frame.receivedAt;
    let started = false;
    if (player.autoAttack === false) {
      if (!Number.isFinite(this.attackAt)) {
        this.attackAt = this.frame.player.attackAt ?? -Infinity;
        this.attackId = this.frame.player.attackId;
      }

      const confirmedAt =
        this.frame.player.attackAt === undefined
          ? -Infinity
          : now - (serverNow - this.frame.player.attackAt);
      const origin = Math.max(confirmedAt, this.requestAt);
      if (player.attacking && now - origin >= stats.attackIntervalMs) {
        this.attackAt = serverNow;
        this.requestAt = now;
        this.attackId = ++this.castSeq;
        this.casts.set(this.attackId, now);
        // Keep completed IDs briefly so delayed confirmation cannot replay an expired visual.
        if (this.casts.size > 32) this.casts.delete(this.casts.keys().next().value!);
        this.send({
          type: 'cast',
          id: this.attackId,
          epoch: this.frame.epoch,
          classId: player.classId ?? 'warrior',
          autoTarget: player.autoTarget !== false,
          aimX: player.aimX ?? player.x,
          aimY: player.aimY ?? player.y,
        });
        started = true;
      }
    } else {
      // Automatic attacks belong to the server clock. Entering a combat area
      // before its first attack snapshot must not invent a swing that confirmation restarts.
      const origin = this.frame.player.attackAt;
      if (origin === undefined) {
        player.attackAt = undefined;
        this.attackAt = -Infinity;
        this.attackId = undefined;

        return false;
      }

      const canRepeat =
        ability.kind === 'slash' ||
        player.autoTarget === false ||
        nearestSpellTarget(player, scene.enemies, stats.range) !== undefined;
      const cycle =
        origin +
        (canRepeat ? Math.floor(Math.max(0, serverNow - origin) / stats.attackIntervalMs) : 0) *
          stats.attackIntervalMs;
      started =
        cycle !== this.attackAt && (canRepeat || serverNow - origin < stats.attackIntervalMs);
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
    this.projectiles.animate(player, world, now, started, this.frame, {
      id: this.attackId,
      at: this.attackAt,
      casts: this.casts,
    });
  }
}
