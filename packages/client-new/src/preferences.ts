export interface Preferences {
  autoAttack: boolean;
  autoTarget: boolean;
  bloodPuddles: boolean;
  damageNumbers: boolean;
  fps: boolean;
  latency: boolean;
  debugHitboxes: boolean;
  sound: boolean;
  music: boolean;
  musicVolume: number;
  volume: number;
}
export function loadPreferences(): Preferences {
  const result = {
    autoAttack: true,
    autoTarget: true,
    bloodPuddles: true,
    damageNumbers: true,
    fps: true,
    latency: true,
    debugHitboxes: false,
    sound: true,
    music: true,
    musicVolume: 0.22,
    volume: 0.35,
  };
  try {
    const saved = JSON.parse(localStorage.getItem("emberfall-new.preferences") ?? "{}");
    for (const key of [
      "autoAttack",
      "autoTarget",
      "bloodPuddles",
      "damageNumbers",
      "fps",
      "latency",
      "debugHitboxes",
      "sound",
      "music",
    ] as const)
      if (typeof saved?.[key] === "boolean") result[key] = saved[key];
    if (typeof saved?.musicVolume === "number" && Number.isFinite(saved.musicVolume))
      result.musicVolume = Math.max(0, Math.min(1, saved.musicVolume));
    if (typeof saved?.volume === "number" && Number.isFinite(saved.volume))
      result.volume = Math.max(0, Math.min(1, saved.volume));
  } catch {
    /* Defaults work without browser storage. */
  }
  return result;
}
