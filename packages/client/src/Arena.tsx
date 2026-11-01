import { ARENA, dimensionDefinition } from '@emberfall/core';
import { DamageMeter } from './DamageMeter';
import { PerformanceGraph } from './PerformanceGraph';
import { useArenaRenderer } from './useArenaRenderer';
import type { ArenaProps } from './arena-contract.ts';

export function Arena(props: ArenaProps) {
  const { world, playerId, preferences, latency } = props;
  const { canvas, frameRate, networkTiming } = useArenaRenderer(props);

  return (
    <>
      <canvas
        ref={canvas}
        width={ARENA.width}
        height={ARENA.height}
        aria-label={
          world
            ? world.players.find((p) => {
                return p.id === playerId;
              })?.scene === 'forest'
              ? `${dimensionDefinition(world.scene?.dimension).name} combat scene.`
              : 'Shared village. Move with WASD or arrow keys.'
            : 'Forest preview'
        }
      />
      <PerformanceGraph
        frameRate={frameRate}
        latency={latency}
        networkTiming={networkTiming}
        showFps={preferences.fps}
        showLatency={preferences.latency}
      />
      {world && preferences.dps && <DamageMeter players={world.players} playerId={playerId} />}
    </>
  );
}
