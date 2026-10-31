import { validateContent } from './validate.ts';
import type { ContentTypes, GameMod, Registries, Registration } from './contracts.ts';
import { createRegistry, validId } from './registry.ts';
import { createRules } from './rules.ts';

export function createGame(mods: readonly GameMod[], random = () => Math.random()) {
  const stores = {
    items: createRegistry<ContentTypes['items']>('items'),
    gearTypes: createRegistry<ContentTypes['gearTypes']>('gearTypes'),
    slots: createRegistry<ContentTypes['slots']>('slots'),
    stats: createRegistry<ContentTypes['stats']>('stats'),
    classes: createRegistry<ContentTypes['classes']>('classes'),
    abilities: createRegistry<ContentTypes['abilities']>('abilities'),
    enemies: createRegistry<ContentTypes['enemies']>('enemies'),
    spawnRules: createRegistry<ContentTypes['spawnRules']>('spawnRules'),
    companions: createRegistry<ContentTypes['companions']>('companions'),
    ailments: createRegistry<ContentTypes['ailments']>('ailments'),
    bosses: createRegistry<ContentTypes['bosses']>('bosses'),
    pickups: createRegistry<ContentTypes['pickups']>('pickups'),
    encounters: createRegistry<ContentTypes['encounters']>('encounters'),
    worlds: createRegistry<ContentTypes['worlds']>('worlds'),
    critters: createRegistry<ContentTypes['critters']>('critters'),
    effects: createRegistry<ContentTypes['effects']>('effects'),
    settings: createRegistry<ContentTypes['settings']>('settings'),
    enemyTypes: createRegistry<ContentTypes['enemyTypes']>('enemyTypes'),
    difficulties: createRegistry<ContentTypes['difficulties']>('difficulties'),
  };
  const registries = Object.freeze(
    Object.fromEntries(Object.entries(stores).map(([name, store]) => [name, store.view])),
  ) as Registries;
  const loaded = new Set<string>();
  try {
    for (const mod of mods) {
      if (!validId(mod.id) || loaded.has(mod.id))
        throw new Error(`Duplicate or invalid mod ID '${mod.id}'`);
      loaded.add(mod.id);
      const registration = Object.freeze(
        Object.fromEntries(
          Object.entries(stores).map(([name, store]) => [
            name,
            Object.freeze({ register: (definition: never) => store.register(definition, mod.id) }),
          ]),
        ),
      ) as Registration;
      const result: unknown = mod.register(registration);
      if (result !== undefined)
        throw new Error(`Mod '${mod.id}': registration must be synchronous and return no value`);
    }

    validateContent(registries, (name, id) => stores[name].owner(id));
  } finally {
    // Failed compositions also close retained registration handles.
    for (const store of Object.values(stores)) store.seal();
  }

  const rules = createRules(registries, random);

  return Object.freeze({
    registries,
    rules,
    random,
    modIds: Object.freeze([...loaded]),
    status: 'ready' as const,
  });
}
