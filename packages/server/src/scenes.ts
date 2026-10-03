import { randomUUID } from "node:crypto";
import {
  FOREST_PORTAL,
  nearbyInteraction,
  stepCombat,
  tickTraining,
  hasLivingScenePlayers,
} from "@emberfall/common";
import type { Player, SceneState, ClientMessage, ChatMessage } from "@emberfall/common";
import { addChat } from "./chat.ts";

export interface Scene extends SceneState {
  nextSpawn: number;
  sequence: number;
  electorate: string;
}
export interface SceneWorld {
  chat?: ChatMessage[];
  players: Map<string, Player>;
  scene?: Scene;
  training?: SceneState;
}
export function returnToLobby(world: SceneWorld, player: Player) {
  if (player.scene)
    addChat(world, `${player.name} left the scene. Everyone became weaker.`, undefined, player.id);
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
    if (world.scene) {
      if (
        ["voting", "countdown"].includes(world.scene.phase) ||
        hasLivingScenePlayers(world.players.values())
      )
        throw new Error(
          "A scene already exists. All living players must leave before regenerating it.",
        );
      for (const participant of world.players.values())
        if (participant.scene === "forest") returnToLobby(world, participant);
    }
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
  } else if (message.type === "joinScene") {
    if (nearbyInteraction(player)?.id !== "portal")
      throw new Error("Move closer to the village portal.");
    if (world.scene?.phase !== "active" || world.scene.portals.length)
      throw new Error(
        "This scene is not open for joining. Create a new one after everyone returns.",
      );
    enterScene(world, player, now);
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
    returnToLobby(world, player);
    cleanupScene(world);
  }
}
export function cleanupScene(world: SceneWorld) {
  if (
    world.scene &&
    world.scene.phase === "ended" &&
    ![...world.players.values()].some((p) => p.scene === "forest")
  )
    world.scene = undefined;
}
function enterScene(world: SceneWorld, player: Player, now: number, offset = 0) {
  addChat(
    world,
    `${player.name} joined the scene. Everyone became stronger.`,
    undefined,
    player.id,
  );
  player.scene = "forest";
  player.x = FOREST_PORTAL.x + offset;
  player.y = FOREST_PORTAL.y;
  player.hitpoints = player.maxHitpoints;
  player.attackAt = now - 700;
  player.attackAngle = undefined;
  if (player.bear) {
    player.bear.x = player.x;
    player.bear.y = player.y;
    player.bear.returning = false;
  }
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
  world.training = tickTraining(world.training, [...world.players.values()], now, dt);
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
      enterScene(world, player, now, (index++ - world.players.size / 2) * 30);
    }
  }
  if (scene.phase !== "active" && scene.phase !== "ended") return;
  const living = [...world.players.values()].filter((player) => player.hitpoints > 0);
  stepCombat(scene, [...world.players.values()], now, dt);
  for (const player of living)
    if (player.hitpoints <= 0) addChat(world, `${player.name} died.`, undefined, player.id);
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
    pausedAt,
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
    pausedAt,
  };
}
