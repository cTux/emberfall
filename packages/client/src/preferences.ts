import { GAME_FONTS, type GameFont } from '@emberfall/ui/fonts';

// Bound untrusted saved auto-cast preferences to 128 IDs of 128 characters, retaining the existing storage budget.
const SAVED_AUTO_CAST_LIMITS = { count: 128, idLength: 128 };

// These three sizes correspond to the shipped cursor assets and persisted settings union.
const CURSOR_SIZES = [32, 48, 64];

export interface Preferences {
  font: GameFont;
  customCursor: boolean;
  cursorSize: 32 | 48 | 64;
  autoAttack: boolean;
  autoCastAbilities?: string[];
  autoTarget: boolean;
  autoLoot: boolean;
  lootHints: boolean;
  hideGatheringHintInCombat: boolean;
  hideHealthBarsInTown: boolean;
  abilityEffectTransparency: number;
  hideOtherPlayerEffects: boolean;
  bloodPuddles: boolean;
  damageNumbers: boolean;
  hideOtherPlayerDamageNumbers: boolean;
  dps: boolean;
  fps: boolean;
  latency: boolean;
  debugHitboxes: boolean;
  sound: boolean;
  music: boolean;
  musicVolume: number;
  volume: number;
}
export function loadPreferences(): Preferences {
  const result: Preferences = {
    font: 'Alegreya Sans',
    customCursor: true,
    cursorSize: 48,
    autoAttack: true,
    autoTarget: true,
    autoLoot: true,
    lootHints: true,
    hideGatheringHintInCombat: true,
    hideHealthBarsInTown: true,
    abilityEffectTransparency: 0,
    hideOtherPlayerEffects: true,
    bloodPuddles: true,
    damageNumbers: true,
    hideOtherPlayerDamageNumbers: true,
    dps: false,
    fps: false,
    latency: false,
    debugHitboxes: false,
    sound: true,
    music: true,
    musicVolume: 0.22,
    volume: 0.35,
  };
  try {
    const saved = JSON.parse(localStorage.getItem('emberfall-new.preferences') ?? '{}');

    if (Array.isArray(saved?.autoCastAbilities)) {
      result.autoCastAbilities = saved.autoCastAbilities
        .filter((id: unknown) => {
          return typeof id === 'string' && id.length <= SAVED_AUTO_CAST_LIMITS.idLength;
        })
        .slice(0, SAVED_AUTO_CAST_LIMITS.count);
    }

    if (typeof saved?.font === 'string' && Object.hasOwn(GAME_FONTS, saved.font)) {
      result.font = saved.font;
    }

    for (const key of [
      'customCursor',
      'autoAttack',
      'autoTarget',
      'autoLoot',
      'lootHints',
      'hideGatheringHintInCombat',
      'hideHealthBarsInTown',
      'hideOtherPlayerEffects',
      'bloodPuddles',
      'damageNumbers',
      'hideOtherPlayerDamageNumbers',
      'dps',
      'fps',
      'latency',
      'debugHitboxes',
      'sound',
      'music',
    ] as const) {
      if (typeof saved?.[key] === 'boolean') {
        result[key] = saved[key];
      }
    }

    if (CURSOR_SIZES.includes(saved?.cursorSize)) {
      result.cursorSize = saved.cursorSize;
    }

    if (typeof saved?.musicVolume === 'number' && Number.isFinite(saved.musicVolume)) {
      result.musicVolume = Math.max(0, Math.min(1, saved.musicVolume));
    }

    if (
      typeof saved?.abilityEffectTransparency === 'number' &&
      Number.isFinite(saved.abilityEffectTransparency)
    ) {
      result.abilityEffectTransparency = Math.max(0, Math.min(1, saved.abilityEffectTransparency));
    }

    if (typeof saved?.volume === 'number' && Number.isFinite(saved.volume)) {
      result.volume = Math.max(0, Math.min(1, saved.volume));
    }
  } catch {
    /* Defaults work without browser storage. */
  }

  return result;
}
