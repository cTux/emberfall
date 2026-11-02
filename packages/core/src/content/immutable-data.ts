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
