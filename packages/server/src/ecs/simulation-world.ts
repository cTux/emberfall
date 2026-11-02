import type { Entity } from './entity.ts';
import { PlayerIndex } from './player-index.ts';
import { World } from 'miniplex';
import type { VillageNpc, SceneState } from '@emberfall/common';
import { SCENE_COLLECTIONS } from '@emberfall/common';

/** One authoritative ECS per party. Components hold the actual simulation state,
 * never copies. Colyseus receives a projection and cannot mutate these components.
 */
export class SimulationWorld {
  readonly ecs = new World<Entity>();
  readonly actors = this.ecs.with('player');
  readonly villagers = this.ecs.with('npc');

  setVillagers(npcs: VillageNpc[]) {
    // Removal swaps query entries; snapshot membership before removing.
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const entity of [...this.villagers]) {
      this.ecs.remove(entity);
    }

    npcs.forEach((npc, order) => {
      return this.ecs.add({ npc, order });
    });

    return [...this.villagers]
      .sort((a, b) => {
        return a.order - b.order;
      })
      .map((e) => {
        return e.npc;
      });
  }

  private scenes = new Map<SceneState, (() => void)[]>();
  readonly players = new PlayerIndex(this.ecs);

  /** Bind collections once. Pure shared systems read query views and commit
   * additions/removals through property assignment. Query order is explicit so
   * Miniplex's swap removal cannot alter target tie-breaking or reward order.
   */
  bind(scene: SceneState) {
    if (this.scenes.has(scene)) {
      return;
    }

    const cleanup: (() => void)[] = [];
    this.scenes.set(scene, cleanup);

    for (const key of SCENE_COLLECTIONS) {
      const query = this.ecs.with(key).where((entity) => {
        return entity.scene === scene;
      });
      const index = new Map<object, Entity>();
      let view: object[] | undefined;
      const replace = (values: object[] | undefined) => {
        if (values === view) {
          return;
        }

        if (
          values &&
          view &&
          values.length === view.length &&
          values.every((value, i) => {
            return value === view![i];
          })
        ) {
          return;
        }

        const next = new Set(values ?? []);

        for (const [value, entity] of index) {
          if (!next.has(value)) {
            this.ecs.remove(entity);
            index.delete(value);
          }
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
                [...query]
                  .sort((a, b) => {
                    return a.order - b.order;
                  })
                  .map((entity) => {
                    return entity[key];
                  }),
              ) as unknown as object[]);
      };

      replace(scene[key]);
      Object.defineProperty(scene, key, {
        enumerable: true,
        configurable: true,
        get: () => {
          return view;
        },
        set: replace,
      });
      cleanup.push(() => {
        Object.defineProperty(scene, key, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: view ? [...view] : undefined,
        });

        for (const entity of index.values()) {
          this.ecs.remove(entity);
        }

        query.disconnect();
      });
    }
  }

  retain(scenes: (SceneState | undefined)[]) {
    for (const [scene, cleanup] of this.scenes) {
      if (!scenes.includes(scene)) {
        for (const release of cleanup) {
          release();
        }

        this.scenes.delete(scene);
      }
    }
  }
}
