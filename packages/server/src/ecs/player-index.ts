import type { Entity } from './entity.ts';
import type { Player } from '@emberfall/core/contracts';
import type { World } from 'miniplex';

export class PlayerIndex extends Map<string, Player> {
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

    if (entity) {
      this.ecs.remove(entity);
    }

    this.index.delete(id);

    return super.delete(id);
  }

  override clear() {
    for (const id of this.keys()) {
      this.delete(id);
    }
  }
}
