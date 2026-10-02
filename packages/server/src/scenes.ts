import { randomUUID } from "node:crypto";
import { FOREST_PORTAL, nearbyInteraction, stepCombat, tickCompanion } from "@emberfall/common";
import type { Player, SceneState, ClientMessage } from "@emberfall/common";

export interface Scene extends SceneState {
  nextSpawn: number;
  sequence: number;
  electorate: string;
}
export interface SceneWorld {
  players: Map<string, Player>;
  scene?: Scene;
}
export function returnToLobby(player: Player) {
  player.scene = undefined;
  player.x = 480;
  player.y = 360;
  player.hitpoints = player.maxHitpoints;
  player.manapoints = player.maxManapoints;
  player.attackAt = undefined;
  player.attackAngle = undefined;
  if (player.bear) {
    player.bear.hitpoints = player.bear.maxHitpoints;
    player.bear.resurrectAt = undefined;
    player.bear.x = player.x;
    player.bear.y = player.y;
    player.bear.returning = false;
  }
}
export function sceneAction(
  world: SceneWorld,
  player: Player,
  message: ClientMessage,
  now: number,
) {
  if (message.type === "createScene") {
    if (nearbyInteraction(player)?.id !== "portal")
      throw new Error("Move closer to the village portal.");
    if (world.scene) throw new Error("A scene already exists. Finish it before opening another.");
    world.scene = {
      id: randomUUID(),
      type: "Forest",
      difficulty: "Easy",
      phase: "voting",
      ready: [],
      countdownAt: null,
      endsAt: null,
      enemies: [],
      damage: [],
      nextSpawn: 0,
      sequence: 0,
      portals: [],
      electorate: "",
    };
  } else if (message.type === "ready") {
    const scene = world.scene;
    if (!scene || !["voting", "countdown"].includes(scene.phase) || player.scene)
      throw new Error("There is no departure vote.");
    scene.ready = scene.ready.filter((id) => id !== player.id);
    if (message.ready) scene.ready.push(player.id);
    reconcileVote(world, now);
  } else if (message.type === "returnLobby" || message.type === "leaveScene") {
    if (
      player.scene !== "forest" ||
      (message.type !== "leaveScene" &&
        player.hitpoints > 0 &&
        nearbyInteraction(player, world.scene?.phase === "ended", world.scene?.portals)?.id !==
          "return")
    )
      throw new Error("Use the return portal after the scene ends.");
    returnToLobby(player);
    cleanupScene(world);
  }
}
export function cleanupScene(world: SceneWorld) {
  if (
    world.scene &&
    ["active", "ended"].includes(world.scene.phase) &&
    ![...world.players.values()].some((p) => p.scene === "forest")
  )
    world.scene = undefined;
}
export function reconcileVote(world: SceneWorld, now: number) {
  const scene = world.scene;
  if (!scene || !["voting", "countdown"].includes(scene.phase)) return;
  const ids = [...world.players.keys()].sort();
  const electorate = ids.join(",");
  if (scene.electorate !== electorate) {
    scene.countdownAt = null;
    scene.electorate = electorate;
  }
  scene.ready = scene.ready.filter((id) => world.players.has(id));
  if (ids.length && ids.every((id) => scene.ready.includes(id))) {
    scene.countdownAt ??= now + 5000;
    scene.phase = "countdown";
  } else {
    scene.phase = "voting";
    scene.countdownAt = null;
  }
}
export function tickScene(world: SceneWorld, now: number, dt: number) {
  for (const player of world.players.values())
    if (!player.scene) tickCompanion(player, undefined, now, dt);
  reconcileVote(world, now);
  const scene = world.scene;
  if (!scene) return;
  if (scene.phase === "countdown" && now >= scene.countdownAt!) {
    scene.phase = "active";
    scene.endsAt = now + 120000;
    scene.countdownAt = null;
    scene.nextSpawn = now;
    let index = 0;
    for (const player of world.players.values()) {
      player.scene = "forest";
      player.x = FOREST_PORTAL.x + (index++ - world.players.size / 2) * 30;
      player.y = FOREST_PORTAL.y;
      player.hitpoints = player.maxHitpoints;
      player.attackAt = now - 700;
      if (player.bear) {
        player.bear.x = player.x;
        player.bear.y = player.y;
        player.bear.returning = false;
      }
    }
  }
  if (scene.phase !== "active" && scene.phase !== "ended") return;
  stepCombat(scene, [...world.players.values()], now, dt);
  cleanupScene(world);
}
export function sceneState(scene?: Scene): SceneState | undefined {
  if (!scene) return undefined;
  const {
    id,
    type,
    difficulty,
    phase,
    ready,
    countdownAt,
    endsAt,
    enemies,
    damage,
    portals,
    sequence,
    nextSpawn,
    bossId,
    spawnCount,
    spawns,
    projectiles,
    drops,
    playerShots,
    explosions,
  } = scene;
  return {
    id,
    type,
    difficulty,
    phase,
    ready,
    countdownAt,
    endsAt,
    enemies,
    damage,
    portals,
    sequence,
    nextSpawn,
    bossId,
    spawnCount,
    spawns,
    projectiles,
    drops,
    playerShots,
    explosions,
  };
}
