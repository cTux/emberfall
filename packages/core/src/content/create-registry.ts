import { validId } from './valid-id.ts';
import { immutableData } from './immutable-data.ts';
import type { Registry } from './contracts.ts';

export function createRegistry<T extends { id: string }>(name: string) {
  const entries = new Map<string, Readonly<T>>();
  const owners = new Map<string, string>();
  let sealed = false;
  const view: Registry<T> = Object.freeze({
    get size() {
      return entries.size;
    },
    has: (id: string) => {
      return entries.has(id);
    },
    get: (id: string) => {
      return entries.get(id);
    },
    require(id: string) {
      const entry = entries.get(id);

      if (!entry) {
        throw new Error(`Unknown ${name} '${id}'`);
      }

      return entry;
    },
    values: () => {
      return Object.freeze([...entries.values()]);
    },
    entries: () => {
      return Object.freeze(
        [...entries].map((entry) => {
          return Object.freeze(entry);
        }),
      );
    },
  });

  return {
    view,
    register(definition: T, mod: string) {
      if (sealed) {
        throw new Error(`Mod '${mod}' cannot register ${name} after initialization`);
      }

      if (!validId(definition?.id)) {
        throw new Error(`Mod '${mod}' ${name}: invalid ID '${String(definition?.id)}'`);
      }

      if (entries.has(definition.id)) {
        throw new Error(
          `Mod '${mod}' ${name} '${definition.id}': duplicate ID (owned by '${owners.get(definition.id)}')`,
        );
      }

      entries.set(
        definition.id,
        immutableData(definition, `Mod '${mod}' ${name} '${definition.id}'`),
      );
      owners.set(definition.id, mod);
    },
    owner: (id: string) => {
      return owners.get(id);
    },
    seal() {
      sealed = true;
    },
  };
}
