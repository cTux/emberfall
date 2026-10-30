import type { Registries, RegistryName } from './contracts.ts';
import { createValidationContext } from './validation/context.ts';
import { validateStructure } from './validation/structure.ts';
import { validateEquipment } from './validation/equipment.ts';
import { validateAbilities } from './validation/abilities.ts';
import { validateEnemies } from './validation/enemies.ts';
import { validateBalance } from './validation/balance.ts';
import { validateWorlds } from './validation/worlds.ts';

export function validateContent(
  r: Registries,
  owner: (name: RegistryName, id: string) => string | undefined,
) {
  const context = createValidationContext(r, owner);
  validateStructure(context);
  validateEquipment(context);
  validateAbilities(context);
  validateEnemies(context);
  validateBalance(context);
  validateWorlds(context);
}
