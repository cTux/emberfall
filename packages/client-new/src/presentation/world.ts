import { World } from "miniplex";
import {
  SCENE_COLLECTIONS,
  type Player,
  type WorldState,
  type SceneCollection,
  type SceneEntity,
} from "@emberfall/common-new";

type Entity = {
  id: string;
  order: number;
  local?: true;
  player?: Player;
  companion?: NonNullable<Player["bear"]>;
} & {
  [K in SceneCollection]?: SceneEntity<K>;
};

/** Reconciled presentation entities. Inputs are detached interpolation/prediction
 * results; neither authoritative snapshots nor Colyseus schemas are mutated.
 */
export class PresentationWorld {
  readonly ecs = new World<Entity>();
  readonly players = this.ecs.with("player");
  readonly localPlayers = this.ecs.with("player", "local");
  private index = new Map<string, Entity>();
  update(world: WorldState | null, playerId: string, predicted?: Player) {
    const present = new Set<string>();
    const put = (
      id: string,
      component: keyof Entity,
      value: unknown,
      order: number,
      local = false,
    ) => {
      present.add(id);
      let entity = this.index.get(id);
      if (!entity) {
        entity = { id, order, [component]: value, ...(local ? { local: true as const } : {}) };
        this.ecs.add(entity);
        this.index.set(id, entity);
      } else {
        Object.assign(entity, { [component]: value, order });
      }
    };
    world?.players.forEach((confirmed, order) => {
      const local = confirmed.id === playerId;
      const player = local && predicted ? { ...predicted, bear: confirmed.bear } : confirmed;
      put(`player:${player.id}`, "player", player, order, local);
      if (player.bear) put(`companion:${player.bear.id}`, "companion", player.bear, order);
    });
    for (const scene of [world?.scene, world?.training])
      if (scene) {
        for (const key of SCENE_COLLECTIONS)
          scene[key]?.forEach((value, order) =>
            put(`${scene.id}:${key}:${value.id}`, key, value, order),
          );
      }
    for (const [id, entity] of this.index)
      if (!present.has(id)) {
        this.ecs.remove(entity);
        this.index.delete(id);
      }
    if (world)
      world.players = [...this.players]
        .sort((a, b) => a.order - b.order)
        .map((entity) => entity.player);
    return this.localPlayers.first?.player;
  }
  clear() {
    this.update(null, "");
  }
}
