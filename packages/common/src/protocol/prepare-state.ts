import { HOT_SCALARS } from './hot-scalars.ts';
import { collections } from './collections.ts';
import type { WorldState, SceneState } from '../index.ts';

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

      if (typeof scalar === 'number') {
        fields |= 1 << bit;
        record[field] = scalar;
      } else {
        record[field] = 0;
      }
    });
    record.fields = fields;
    record.order = order;
    record.payload = JSON.stringify(payload);
    entities.push(record);
  };

  const sceneHeader = (scene: SceneState | undefined, prefix: string) => {
    if (!scene) {
      return undefined;
    }

    const header = { ...scene };

    for (const collection of collections) {
      scene[collection]?.forEach((value, order) => {
        return put(`${prefix}:${collection}:${value.id}`, value, order);
      });
      delete header[collection];
    }

    return header;
  };

  source.players.forEach((player, order) => {
    return put(`player:${player.id}`, player, order);
  });
  source.npcs?.forEach((npc, order) => {
    return put(`npc:${npc.id}`, npc, order);
  });
  const { players: _, npcs: _npcs, scene, training, serverNow, ...header } = source;

  return {
    header: JSON.stringify({
      ...header,
      ...(source.npcs ? { npcs: [] } : {}),
      scene: sceneHeader(scene, 'scene'),
      training: sceneHeader(training, 'training'),
    }),
    entities,
    serverNow: serverNow ?? 0,
  };
}
