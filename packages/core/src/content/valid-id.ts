export function validId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/.test(id) &&
    !['constructor', 'prototype', '__proto__'].includes(id)
  );
}
