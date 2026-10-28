import { GAME_FONTS, type GameFont } from '@emberfall/ui/fonts';

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
  bloodPuddles: boolean;
  damageNumbers: boolean;
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
    bloodPuddles: true,
    damageNumbers: true,
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
    if (Array.isArray(saved?.autoCastAbilities))
      result.autoCastAbilities = saved.autoCastAbilities
        .filter((id: unknown) => typeof id === 'string' && id.length <= 128)
        .slice(0, 128);
    if (typeof saved?.font === 'string' && Object.hasOwn(GAME_FONTS, saved.font))
      result.font = saved.font;
    for (const key of [
      'customCursor',
      'autoAttack',
      'autoTarget',
      'autoLoot',
      'lootHints',
      'hideGatheringHintInCombat',
      'hideHealthBarsInTown',
      'bloodPuddles',
      'damageNumbers',
      'dps',
      'fps',
      'latency',
      'debugHitboxes',
      'sound',
      'music',
    ] as const)
      if (typeof saved?.[key] === 'boolean') result[key] = saved[key];
    if ([32, 48, 64].includes(saved?.cursorSize)) result.cursorSize = saved.cursorSize;
    if (typeof saved?.musicVolume === 'number' && Number.isFinite(saved.musicVolume))
      result.musicVolume = Math.max(0, Math.min(1, saved.musicVolume));
    if (typeof saved?.volume === 'number' && Number.isFinite(saved.volume))
      result.volume = Math.max(0, Math.min(1, saved.volume));
  } catch {
    /* Defaults work without browser storage. */
  }
  return result;
}
