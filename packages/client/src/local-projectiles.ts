import {
  wrap,
  wrappedDelta,
  type Player,
  type PlayerShot,
  type WorldState,
} from '@emberfall/common';
import { FOREST, game, advancePlayerShot, fireClassAttack } from '@emberfall/core';
import { PREDICTION_LIMIT_MS, type ConfirmedFrame, type AttackState } from './prediction-frame.ts';

export class LocalProjectiles {
  private shots: (PlayerShot & { confirmedId?: number })[] = [];
  private shotCastAt = -Infinity;
  private shotsAt = 0;

  reset(now: number) {
    this.shots = [];
    this.shotCastAt = -Infinity;
    this.shotsAt = now;
  }

  reject(id: number) {
    this.shots = this.shots.filter((shot) => shot.castId !== id);
  }

  animate(
    player: Player,
    world: WorldState,
    now: number,
    started: boolean,
    frame: ConfirmedFrame,
    attack: AttackState,
  ) {
    const scene = player.scene === 'forest' ? world.scene : world.training;
    const confirmed = player.scene === 'forest' ? frame.world.scene : frame.world.training;
    // Apply the prediction offset once at adoption, never every frame. Retain
    // distance already flown, remaining range, heading and authoritative identity.
    const adopt = (shot: PlayerShot) => ({
      ...shot,
      x:
        shot.kind === 'roots' && shot.hitIds.length
          ? shot.x
          : wrap(shot.x + wrappedDelta(player.x, frame.player.x, FOREST.width), FOREST.width),
      y:
        shot.kind === 'roots' && shot.hitIds.length
          ? shot.y
          : wrap(shot.y + wrappedDelta(player.y, frame.player.y, FOREST.height), FOREST.height),
      confirmedId: shot.id,
      hitIds: [...shot.hitIds],
    });
    const dt = Math.min(100, Math.max(0, now - this.shotsAt)) / 1000;
    this.shotsAt = now;
    if (!scene) {
      this.shots = [];

      return;
    }

    if (
      player.hitpoints <= 0 ||
      scene.phase !== 'active' ||
      scene.pausedAt !== undefined ||
      game.registries.abilities.require(
        game.registries.classes.require(player.classId ?? 'warrior').attack,
      ).kind === 'slash' ||
      now - frame.receivedAt > PREDICTION_LIMIT_MS
    ) {
      this.shots = [];
    } else {
      // Confirm targets and retire completed/rejected casts without replaying delayed spawns.
      const matched = new Set<number>();
      this.shots = this.shots.filter((shot) => {
        const acknowledged =
          shot.castId !== undefined
            ? (frame.player.castSeq ?? 0) >= shot.castId &&
              (frame.world.serverNow ?? 0) >= (frame.player.attackAt ?? 0)
            : (frame.player.attackAt ?? -Infinity) >= shot.castAt!;
        if (acknowledged) {
          const candidates = confirmed?.playerShots?.filter(
            (s) =>
              s.ownerId === player.id &&
              !s.abilityId?.startsWith('talent:') &&
              (shot.castId !== undefined ? s.castId === shot.castId : s.castAt === shot.castAt) &&
              !matched.has(s.id),
          );
          const serverShot =
            shot.confirmedId !== undefined
              ? candidates?.find((s) => s.id === shot.confirmedId)
              : (candidates?.find((s) => s.targetId === shot.targetId) ?? candidates?.[0]);
          if (!serverShot) return false;
          matched.add(serverShot.id);
          shot.id = serverShot.id;
          shot.confirmedId = serverShot.id;
          // Keep the same visual through every server-confirmed turn.
          if (serverShot.kind === 'roots' && serverShot.hitIds.length > shot.hitIds.length) {
            Object.assign(shot, serverShot, { hitIds: [...serverShot.hitIds] });
          }

          shot.targetId = serverShot.targetId;
          shot.targetX = serverShot.targetX;
          shot.targetY = serverShot.targetY;
          // A ballistic visual keeps its launch heading. Re-aiming it from a
          // newer server origin creates a visible kink in the flight path.
        }

        // Buffered enemies are behind the local shot's clock. They must not
        // invent an impact that hides a projectile the server still has alive.
        advancePlayerShot(shot, confirmed?.enemies ?? [], dt, undefined, false);

        return shot.remaining > 0.001;
      });
      if (started && player.attackAt !== undefined && now - player.attackAt < 100) {
        const known =
          confirmed?.playerShots?.filter(
            (shot) =>
              shot.ownerId === player.id &&
              !shot.abilityId?.startsWith('talent:') &&
              (attack.id !== undefined ? shot.castId === attack.id : shot.castAt === attack.at),
          ) ?? [];
        if (known.length) {
          this.shots.push(
            ...known
              .filter((shot) => !this.shots.some((existing) => existing.confirmedId === shot.id))
              .map(adopt),
          );
          this.shotCastAt = attack.at;
        } else if ((frame.player.attackAt ?? -Infinity) < attack.at) {
          const cast = { ...scene, sequence: 0, playerShots: [] as PlayerShot[] };
          fireClassAttack(cast, { ...player, attackAt: attack.at });
          this.shots.push(...cast.playerShots);
          if (cast.playerShots.length) this.shotCastAt = attack.at;
        }
      }

      // A target absent from our snapshots cannot be predicted. Launch that server cast here too.
      const missed =
        confirmed?.playerShots?.filter(
          (s) =>
            s.ownerId === player.id &&
            !s.abilityId?.startsWith('talent:') &&
            s.castAt !== undefined &&
            s.castAt > this.shotCastAt &&
            (s.castId === undefined || !attack.casts.has(s.castId)),
        ) ?? [];
      for (const shot of missed)
        // Late discoveries are already in flight. Moving them back to the
        // player while keeping the server's remaining range truncates the shot.
        this.shots.push(adopt(shot));
      if (missed.length) this.shotCastAt = Math.max(...missed.map((s) => s.castAt!));
    }

    // Only replace our projectiles; other players retain snapshot interpolation.
    scene.playerShots = [
      ...(scene.playerShots ?? []).filter(
        (s) => s.ownerId !== player.id || s.abilityId?.startsWith('talent:'),
      ),
      ...this.shots.map((s) => ({ ...s })),
    ];
  }
}
