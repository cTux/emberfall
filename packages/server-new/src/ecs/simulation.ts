import { World } from "miniplex";
import type { Player, SceneState } from "@emberfall/common-new";
import { SCENE_COLLECTIONS, type SceneCollection, type SceneEntity } from "@emberfall/common-new";

type Entity = { scene?: SceneState; order: number; player?: Player } & {
  [K in SceneCollection]?: SceneEntity<K>;
};

class PlayerIndex extends Map<string, Player> {
  private ecs: World<Entity>;
  private index = new Map<string, Entity>();
  private order = 0;
  constructor(ecs: World<Entity>) {
    super();
    this.ecs = ecs;
  }
  override set(id: string, player: Player) {
    this.delete(id);
    this.index.set(id, this.ecs.add({ player, order: this.order++ }));
    return super.set(id, player);
  }
  override delete(id: string) {
    const entity = this.index.get(id);
    if (entity) this.ecs.remove(entity);
    this.index.delete(id);
    return super.delete(id);
  }
  override clear() {
    for (const id of this.keys()) this.delete(id);
  }
}

/** One authoritative ECS per party. Components hold the actual simulation state,
 * never copies. Colyseus receives a projection and cannot mutate these components.
 */
export class SimulationWorld {
  readonly ecs = new World<Entity>();
  readonly actors = this.ecs.with("player");
  private scenes = new Map<SceneState, (() => void)[]>();
  readonly players = new PlayerIndex(this.ecs);
  /** Bind collections once. Pure shared systems read query views and commit
   * additions/removals through property assignment. Query order is explicit so
   * Miniplex's swap removal cannot alter target tie-breaking or reward order.
   */
  bind(scene: SceneState) {
    if (this.scenes.has(scene)) return;
    const cleanup: (() => void)[] = [];
    this.scenes.set(scene, cleanup);
    for (const key of SCENE_COLLECTIONS) {
      const query = this.ecs.with(key).where((entity) => entity.scene === scene);
      const index = new Map<object, Entity>();
      let view: object[] | undefined;
      const replace = (values: object[] | undefined) => {
        if (values === view) return;
        if (
          values &&
          view &&
          values.length === view.length &&
          values.every((value, i) => value === view![i])
        )
          return;
        const next = new Set(values ?? []);
        for (const [value, entity] of index)
          if (!next.has(value)) {
            this.ecs.remove(entity);
            index.delete(value);
          }
        (values ?? []).forEach((value, order) => {
          let entity = index.get(value);
          if (!entity) {
            entity = this.ecs.add({ scene, order, [key]: value });
            index.set(value, entity);
          }
          entity.order = order;
        });
        view =
          values === undefined
            ? undefined
            : (Object.freeze(
                [...query].sort((a, b) => a.order - b.order).map((entity) => entity[key]!),
              ) as unknown as object[]);
      };
      replace(scene[key]);
      Object.defineProperty(scene, key, {
        enumerable: true,
        configurable: true,
        get: () => view,
        set: replace,
      });
      cleanup.push(() => {
        Object.defineProperty(scene, key, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: view ? [...view] : undefined,
        });
        for (const entity of index.values()) this.ecs.remove(entity);
        query.disconnect();
      });
    }
  }
  retain(scenes: (SceneState | undefined)[]) {
    for (const [scene, cleanup] of this.scenes)
      if (!scenes.includes(scene)) {
        for (const release of cleanup) release();
        this.scenes.delete(scene);
      }
  }
}

const owners = new WeakMap<Map<string, Player>, SimulationWorld>();
export function createPlayers() {
  const owner = new SimulationWorld();
  owners.set(owner.players, owner);
  return owner.players;
}
export function simulationFor(players: Map<string, Player>) {
  return owners.get(players);
}
