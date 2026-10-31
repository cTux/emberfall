import type { Registry } from './contracts.ts';

export function immutableData<T>(value: T, path: string, seen = new Set<unknown>()): T {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'object' || seen.has(value)) {
    throw new Error(`${path}: expected finite, acyclic serializable data`);
  }

  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${path}: expected plain data`);
  }

  seen.add(value);
  const copy = Array.isArray(value)
    ? value.map((entry, index) => {
        return immutableData(entry, `${path}.${index}`, seen);
      })
    : Object.fromEntries(
        Object.entries(value).map(([key, entry]) => {
          return [key, immutableData(entry, `${path}.${key}`, seen)];
        }),
      );
  seen.delete(value);

  return Object.freeze(copy) as T;
}

export function validId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/.test(id) &&
    !['constructor', 'prototype', '__proto__'].includes(id)
  );
}

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
