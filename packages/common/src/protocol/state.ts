import { schema, t, type SchemaType } from "@colyseus/schema";
import type { WorldState, SceneState } from "../index.ts";
const HOT_SCALARS = [
  "x",
  "y",
  "angle",
  "attackAngle",
  "inputSeq",
  "inputElapsed",
  "inputAt",
] as const;
export const EntityState = schema(
  {
    x: t.float64(),
    y: t.float64(),
    angle: t.float64(),
    attackAngle: t.float64(),
    inputSeq: t.float64(),
    inputElapsed: t.float64(),
    inputAt: t.float64(),
    fields: t.uint8(),
    order: t.uint16(),
    payload: t.string(),
  },
  "EntityState",
);
export type EntityState = SchemaType<typeof EntityState>;
export const SessionState = schema(
  { header: t.string(), entities: t.map(EntityState), serverNow: t.float64() },
  "SessionState",
);
export type SessionState = SchemaType<typeof SessionState>;
const collections = [
  "enemies",
  "damage",
  "playerShots",
  "explosions",
  "drops",
  "spawns",
  "projectiles",
] as const;
type ProjectedEntity = Record<(typeof HOT_SCALARS)[number], number> & {
  key: string;
  fields: number;
  order: number;
  payload: string;
};
export function prepareState(source: WorldState) {
  const entities: ProjectedEntity[] = [];
  const put = (key: string, value: { x: number; y: number }, order: number) => {
    const record = { key } as ProjectedEntity;
    const { x, y, angle, attackAngle, inputSeq, inputElapsed, inputAt, ...payload } = value as {
      x: number;
      y: number;
    } & Partial<Record<(typeof HOT_SCALARS)[number], number>>;
    const scalars = { x, y, angle, attackAngle, inputSeq, inputElapsed, inputAt };
    let fields = 0;
    HOT_SCALARS.forEach((field, bit) => {
      const scalar = scalars[field];
      if (typeof scalar === "number") {
        fields |= 1 << bit;
        record![field] = scalar;
      } else record![field] = 0;
    });
    record.fields = fields;
    record.order = order;
    record.payload = JSON.stringify(payload);
    entities.push(record);
  };
  const sceneHeader = (scene: SceneState | undefined, prefix: string) => {
    if (!scene) return undefined;
    const header = { ...scene };
    for (const collection of collections) {
      scene[collection]?.forEach((value, order) =>
        put(`${prefix}:${collection}:${value.id}`, value, order),
      );
      delete header[collection];
    }
    return header;
  };
  source.players.forEach((player, order) => put(`player:${player.id}`, player, order));
  const { players: _, scene, training, serverNow, ...header } = source;
  return {
    header: JSON.stringify({
      ...header,
      scene: sceneHeader(scene, "scene"),
      training: sceneHeader(training, "training"),
    }),
    entities,
    serverNow: serverNow ?? 0,
  };
}
export type PreparedState = ReturnType<typeof prepareState>;
export function applyState(target: SessionState, source: PreparedState) {
  const present = new Set<string>();
  for (const value of source.entities) {
    present.add(value.key);
    let record = target.entities.get(value.key);
    if (!record) {
      record = new EntityState();
      target.entities.set(value.key, record);
    }
    for (const field of HOT_SCALARS) record[field] = value[field];
    record.fields = value.fields;
    record.order = value.order;
    record.payload = value.payload;
  }
  target.header = source.header;
  target.serverNow = source.serverNow;
  for (const key of target.entities.keys()) if (!present.has(key)) target.entities.delete(key);
}
export function projectState(target: SessionState, source: WorldState) {
  applyState(target, prepareState(source));
}

export function materializeState(state: SessionState): WorldState | undefined {
  if (!state.header) return undefined;
  const world = JSON.parse(state.header) as WorldState;
  world.serverNow = state.serverNow;
  world.players = [];
  for (const scene of [world.scene, world.training])
    if (scene) {
      for (const key of collections) Object.assign(scene, { [key]: [] });
    }
  for (const [key, record] of [...state.entities].sort((a, b) => a[1].order - b[1].order)) {
    const value = JSON.parse(record.payload);
    HOT_SCALARS.forEach((field, bit) => {
      if (record.fields & (1 << bit)) value[field] = record[field];
    });
    if (key.startsWith("player:")) world.players.push(value);
    else {
      const [prefix, collection] = key.split(":");
      const scene = prefix === "scene" ? world.scene : world.training;
      if (scene && collections.includes(collection as (typeof collections)[number]))
        (scene[collection as (typeof collections)[number]] as unknown[]).push(value);
    }
  }
  return world;
}
