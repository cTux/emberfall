import type { Preferences } from "./preferences";

let audioUnlocked = false;

export function gameAudio(preferences: () => Preferences) {
  const tracks = {
    start: ["Intro", "Theme_001"],
    lobby: ["In_The_Woods", "Adventure"],
    combat: ["Trials", "Wastelands"],
  };
  const selected = { start: 0, lobby: 0, combat: 0 };
  const music = Object.fromEntries(
    Object.entries(tracks).map(([zone, names]) => [
      zone,
      names.map((name, index) => {
        const audio = new Audio(`/audio/${name}.mp3`);
        audio.preload = "auto";
        audio.volume = 0;
        audio.addEventListener("ended", () => {
          started.delete(audio);
          audio.currentTime = 0;
          const key = zone as keyof typeof tracks;
          if (selected[key] === index) selected[key] = (index + 1) % names.length;
        });
        return audio;
      }),
    ]),
  );
  const sounds = Object.fromEntries(
    ["slash", "hit", "warning"].map((name) => [
      name,
      Array.from({ length: 4 }, () => {
        const audio = new Audio(`/audio/${name}.wav`);
        audio.preload = "auto";
        return audio;
      }),
    ]),
  );
  let area: keyof typeof tracks = "start",
    unlocked = audioUnlocked,
    lastTime = 0;
  const started = new Set<HTMLAudioElement>();
  const start = (audio: HTMLAudioElement) => {
    if (started.has(audio)) return;
    started.add(audio);
    void audio.play().catch(() => started.delete(audio));
  };
  const unlock = () => {
    audioUnlocked = true;
    unlocked = true;
    if (preferences().music && !document.hidden) start(music[area][selected[area]]);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  const silence = () => {
    if (!document.hidden) return;
    for (const audio of [...Object.values(music).flat(), ...Object.values(sounds).flat()])
      audio.pause();
    started.clear();
  };
  document.addEventListener("visibilitychange", silence);
  return {
    update(nextArea: keyof typeof tracks, now: number) {
      area = nextArea;
      const prefs = preferences();
      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      for (const [key, playlist] of Object.entries(music))
        for (const [index, audio] of playlist.entries()) {
          const target =
            unlocked && !document.hidden && prefs.music && key === area && index === selected[area]
              ? prefs.musicVolume
              : 0;
          audio.volume += Math.max(-dt, Math.min(dt, target - audio.volume));
          if (target > 0) start(audio);
          else if (audio.volume <= 0.001) {
            audio.pause();
            started.delete(audio);
          }
        }
      if (!prefs.sound)
        for (const pool of Object.values(sounds)) for (const audio of pool) audio.pause();
    },
    play(name: "slash" | "hit" | "warning") {
      const prefs = preferences();
      if (!unlocked || !prefs.sound || document.hidden || prefs.volume === 0) return;
      const audio = sounds[name].find((voice) => voice.paused || voice.ended);
      if (!audio) return;
      audio.currentTime = 0;
      audio.volume = prefs.volume;
      void audio.play().catch(() => {});
    },
    dispose() {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", silence);
      for (const audio of [...Object.values(music).flat(), ...Object.values(sounds).flat()]) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    },
  };
}
