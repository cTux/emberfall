import { useEffect, useRef } from 'react';
import { LootHints } from './loot-hints';
import type { ArenaProps } from './arena-contract';

export function useArenaState(
  { world, playerId, send, graphics, preferences, onInteract, onCatSpeech }: ArenaProps,
  selectedFont: string,
) {
  const lootHints = useRef(new LootHints());
  const latest = useRef(world);
  const receivedAt = useRef(0);
  const sender = useRef(send);
  const activate = useRef(onInteract);
  const catSpoke = useRef(onCatSpeech);
  const quality = useRef(graphics);
  const prefs = useRef(preferences);
  const fontFamily = useRef(selectedFont);
  const frameRate = useRef<number | null>(null);
  const networkTiming = useRef<{ inputDelay: number | null; snapshotAge: number | null }>({
    inputDelay: null,
    snapshotAge: null,
  });
  useEffect(() => {
    lootHints.current = new LootHints();
  }, [playerId]);
  useEffect(() => {
    if (latest.current !== world) {
      receivedAt.current = performance.now();
    }

    const confirmedPlayer = world?.players.find((player) => {
      return player.id === playerId;
    });
    lootHints.current.observe(
      confirmedPlayer ? (confirmedPlayer.backpack ?? []) : undefined,
      preferences.lootHints,
      performance.now(),
    );
    latest.current = world;
    sender.current = send;
    activate.current = onInteract;
    catSpoke.current = onCatSpeech;
    quality.current = graphics;
    prefs.current = preferences;
    fontFamily.current = selectedFont;
  }, [world, playerId, send, graphics, preferences, onInteract, onCatSpeech, selectedFont]);

  return {
    lootHints,
    latest,
    receivedAt,
    sender,
    activate,
    catSpoke,
    quality,
    prefs,
    fontFamily,
    frameRate,
    networkTiming,
  };
}
