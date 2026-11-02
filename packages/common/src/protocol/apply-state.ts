import type { SessionState } from './session-state.ts';
import type { PreparedState } from './prepared-state.ts';
import { EntityState } from './entity-state.ts';
import { HOT_SCALARS } from './hot-scalars.ts';

export function applyState(target: SessionState, source: PreparedState) {
  const present = new Set<string>();

  for (const value of source.entities) {
    present.add(value.key);
    let record = target.entities.get(value.key);

    if (!record) {
      record = new EntityState();
      target.entities.set(value.key, record);
    }

    for (const field of HOT_SCALARS) {
      record[field] = value[field];
    }

    record.fields = value.fields;
    record.order = value.order;
    record.payload = value.payload;
  }

  target.header = source.header;
  target.serverNow = source.serverNow;

  for (const key of target.entities.keys()) {
    if (!present.has(key)) {
      target.entities.delete(key);
    }
  }
}
