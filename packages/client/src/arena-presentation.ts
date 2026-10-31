import type { ClientMessage, WorldState } from '@emberfall/common';
import type { Preferences } from './preferences';
import type { createArenaInput } from './arena-input';
import { SnapshotBuffer } from './snapshots';
import { LocalMovement } from './local-movement';
import { PresentationWorld } from './presentation/world';
import { gameAudio } from './audio';
import { alignLocalPickups } from './pickup-presentation';
import { combatCursor } from './cursors';
import { dayNight } from './day-night';

type FrameInput = Pick<
  ReturnType<typeof createArenaInput>,
  'camera' | 'combat' | 'held' | 'blocked' | 'currentAim' | 'pointer'
>;

export class ArenaPresentation {
  private snapshots: SnapshotBuffer;
  private movement: LocalMovement;
  private world = new PresentationWorld();
  private audio: ReturnType<typeof gameAudio>;
  private playerId: string;
  private onHitpoints: (hp: Record<string, number>) => void;
  private previousHp = '';
  private lastSlashAt = -Infinity;
  private lastHit = 0;
  private lastWarning = 0;

  constructor(
    playerId: string,
    send: (message: ClientMessage) => void,
    preferences: () => Preferences,
    onHitpoints: (hp: Record<string, number>) => void,
  ) {
    this.playerId = playerId;
    this.onHitpoints = onHitpoints;
    this.snapshots = new SnapshotBuffer(playerId);
    this.movement = new LocalMovement(playerId, send);
    this.audio = gameAudio(preferences);
  }

  input(x: number, y: number, now: number) {
    this.movement.input(x, y, now);
  }

  render(
    world: WorldState | null,
    now: number,
    input: FrameInput,
    viewport: { width: number; height: number },
    preferences: Preferences,
  ) {
    if (world) {
      this.snapshots.push(world, now);
    }

    const view = world ? this.snapshots.render(now) : null;
    const cycle = dayNight(view?.serverNow ?? 0);
    const local = world ? this.movement.render(world, now) : undefined;
    let localSwing = false;

    if (view && local) {
      const width = viewport.width,
        height = viewport.height;
      input.camera = {
        x: local.x - width / 2,
        y: local.y - height / 2,
        width,
        height,
      };
      input.combat = {
        type: 'combatInput',
        autoAttack: preferences.autoAttack,
        autoTarget: preferences.autoTarget,
        autoLoot: preferences.autoLoot,
        attacking: input.held && !input.blocked(),
        ...input.currentAim(),
      };
      Object.assign(local, input.combat);
      localSwing = this.movement.animateAttack(local, view, now);
      this.movement.animateProjectiles(local, view, now, localSwing);
      alignLocalPickups(view, local);
    }

    this.world.update(view, this.playerId, local);
    const cursor = combatCursor(
      view,
      local,
      input.pointer
        ? {
            x: input.camera.x + input.pointer.x * input.camera.width,
            y: input.camera.y + input.pointer.y * input.camera.height,
          }
        : undefined,
      input.held,
      input.blocked(),
      preferences.autoTarget,
    );
    const timing = {
      inputDelay: this.movement.inputDelay(now),
      snapshotAge: this.snapshots.age(now),
    };
    this.audio.update(
      local?.scene === 'forest' && view?.scene?.phase === 'active'
        ? 'combat'
        : view
          ? 'lobby'
          : 'start',
      now,
    );
    const warning = view?.scene?.spawns?.at(-1)?.id ?? 0;

    if (warning && warning !== this.lastWarning) {
      this.lastWarning = warning;
      this.audio.play('warning');
    }

    const hp = Object.fromEntries(
      (view?.players ?? []).map((p) => {
        return [p.id, p.hitpoints];
      }),
    );
    const hpKey = JSON.stringify(hp);

    if (hpKey !== this.previousHp) {
      this.previousHp = hpKey;
      this.onHitpoints(hp);
    }

    return { view, local, localSwing, cursor, timing, cycle };
  }

  effects(
    frame: Pick<ReturnType<ArenaPresentation['render']>, 'view' | 'local' | 'localSwing'>,
    now: number,
  ) {
    const { view, local, localSwing } = frame;

    if (localSwing && now - this.lastSlashAt >= 500) {
      this.lastSlashAt = now;
      this.audio.play('slash');
    }

    const hit = view?.scene?.damage.at(-1);

    if (local?.scene === 'forest' && hit && hit.id !== this.lastHit) {
      this.lastHit = hit.id;
      this.audio.play('hit');
    }
  }

  dispose() {
    this.world.clear();
    this.audio.dispose();
  }
}
