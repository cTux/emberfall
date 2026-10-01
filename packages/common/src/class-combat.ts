import { FOREST, forestDistance, wrappedDelta, wrap } from "./scene.ts";
import { ENEMY_STATS } from "./enemies.ts";
import type { DebuffKind, Enemy, SceneState } from "./scene.ts";
import type { Player } from "./index.ts";

export function hitEnemy(
  scene: SceneState,
  enemy: Enemy,
  amount: number,
  owner: Player | undefined,
  now: number,
  ailment?: DebuffKind,
) {
  if (enemy.hitpoints <= 0) return;
  enemy.hitpoints = Math.max(0, enemy.hitpoints - amount);
  scene.damage.push({
    id: ++scene.sequence,
    x: enemy.x,
    y: enemy.y,
    amount,
    at: now,
    target: `enemy:${enemy.id}`,
    killed: enemy.hitpoints === 0,
    enemy:
      enemy.hitpoints === 0
        ? { archetype: enemy.archetype, kind: enemy.kind, angle: enemy.angle }
        : undefined,
  });
  if (enemy.hitpoints > 0 && ailment && owner && Math.random() < 0.1) {
    enemy.debuffs ??= [];
    let debuff = enemy.debuffs.find((d) => d.kind === ailment && d.expiresAt >= now);
    if (!debuff) {
      debuff = {
        kind: ailment,
        stacks: 0,
        expiresAt: now + 5000,
        nextTick: now + 1000,
        ownerId: owner.id,
      };
      enemy.debuffs = enemy.debuffs.filter((d) => d.kind !== ailment);
      enemy.debuffs.push(debuff);
    }
    debuff.stacks++;
    debuff.expiresAt = now + 5000;
    debuff.ownerId = owner.id;
  }
  if (enemy.hitpoints > 0) return;
  if (owner) owner.experience++;
  scene.drops ??= [];
  scene.drops.push({ id: ++scene.sequence, kind: "experience", x: enemy.x, y: enemy.y, at: now });
  if (Math.random() < 0.1)
    scene.drops.push({
      id: ++scene.sequence,
      kind: "gold",
      x: wrap(enemy.x + 10, FOREST.width),
      y: enemy.y,
      at: now,
    });
  if (scene.drops.length > 512) scene.drops.splice(0, scene.drops.length - 512);
}

export function tickDebuffs(scene: SceneState, players: Player[], now: number) {
  for (const enemy of scene.enemies) {
    for (const debuff of enemy.debuffs ?? []) {
      while (debuff.nextTick <= Math.min(now, debuff.expiresAt) && enemy.hitpoints > 0) {
        hitEnemy(
          scene,
          enemy,
          debuff.stacks,
          players.find((p) => p.id === debuff.ownerId),
          now,
        );
        debuff.nextTick += 1000;
      }
    }
    enemy.debuffs = enemy.debuffs?.filter((d) => d.expiresAt > now);
  }
}

export function fireClassAttack(scene: SceneState, player: Player) {
  const targets = scene.enemies
    .filter((e) => e.hitpoints > 0 && forestDistance(e, player) <= 1000)
    .sort((a, b) => forestDistance(a, player) - forestDistance(b, player))
    .slice(0, player.classId === "mage" ? 2 : 1);
  scene.playerShots ??= [];
  for (const target of targets) {
    scene.playerShots.push({
      id: ++scene.sequence,
      ownerId: player.id,
      kind: player.classId === "mage" ? "fireball" : "arrow",
      x: player.x,
      y: player.y,
      angle: Math.atan2(
        wrappedDelta(target.y, player.y, FOREST.height),
        wrappedDelta(target.x, player.x, FOREST.width),
      ),
      remaining: 1000,
      hitIds: [],
      targetId: target.id,
      targetX: target.x,
      targetY: target.y,
    });
  }
}

export function tickPlayerShots(scene: SceneState, players: Player[], now: number, dt: number) {
  scene.explosions = (scene.explosions ?? []).filter((e) => now - e.at < 350);
  scene.playerShots = (scene.playerShots ?? []).filter((shot) => {
    const owner = players.find(
      (p) => p.id === shot.ownerId && p.scene === "forest" && p.hitpoints > 0,
    );
    if (!owner) return false;
    const target = scene.enemies.find((e) => e.id === shot.targetId && e.hitpoints > 0);
    if (shot.kind === "fireball" && target) {
      shot.targetX = target.x;
      shot.targetY = target.y;
    }
    const distance = Math.min(
      shot.remaining,
      Math.max(0, dt) * (shot.kind === "arrow" ? 600 : 380),
    );
    const steps = Math.max(1, Math.ceil(distance / 6));
    for (let i = 0; i < steps; i++) {
      if (shot.kind === "fireball")
        shot.angle = Math.atan2(
          wrappedDelta(shot.targetY!, shot.y, FOREST.height),
          wrappedDelta(shot.targetX!, shot.x, FOREST.width),
        );
      shot.x = wrap(shot.x + (Math.cos(shot.angle) * distance) / steps, FOREST.width);
      shot.y = wrap(shot.y + (Math.sin(shot.angle) * distance) / steps, FOREST.height);
      shot.remaining -= distance / steps;
      if (shot.kind === "arrow") {
        for (const enemy of scene.enemies) {
          if (
            enemy.hitpoints <= 0 ||
            shot.hitIds.includes(enemy.id) ||
            forestDistance(shot, enemy) > ENEMY_STATS[enemy.archetype ?? "skeleton"].radius + 4
          )
            continue;
          shot.hitIds.push(enemy.id);
          hitEnemy(scene, enemy, 5, owner, now, "poison");
        }
      } else if (forestDistance(shot, { x: shot.targetX!, y: shot.targetY! }) <= 12) {
        shot.x = shot.targetX!;
        shot.y = shot.targetY!;
        scene.explosions!.push({ id: ++scene.sequence, x: shot.x, y: shot.y, at: now });
        for (const enemy of scene.enemies)
          if (forestDistance(shot, enemy) <= 100) hitEnemy(scene, enemy, 2, owner, now, "burn");
        return false;
      }
    }
    return shot.remaining > 0.001;
  });
}
