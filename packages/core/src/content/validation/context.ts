import type { Registries, RegistryName } from '../contracts.ts';

export function createValidationContext(
  r: Registries,
  owner: (name: RegistryName, id: string) => string | undefined,
) {
  const fail = (name: RegistryName, id: string, message: string): never => {
    throw new Error(`Mod '${owner(name, id)}' ${name} '${id}': ${message}`);
  };

  const check = (ok: unknown, name: RegistryName, id: string, message: string) => {
    if (!ok) fail(name, id, message);
  };

  const positive = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;
  const nonnegative = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const reference = (name: RegistryName, id: string, target: RegistryName, value: string) =>
    check(r[target].has(value), name, id, `unknown ${target} reference '${value}'`);

  return { r, fail, check, positive, nonnegative, reference };
}

export type ValidationContext = ReturnType<typeof createValidationContext>;
