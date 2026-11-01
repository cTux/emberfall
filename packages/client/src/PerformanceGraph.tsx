import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { PerformanceMonitor, useDraggable } from '@emberfall/ui';

// Half-second samples retain the existing 30-second, 60-point diagnostic window.
const PERFORMANCE_SAMPLING = { intervalMs: 500, retentionMs: 30_000, previousSamples: 59 };

type Timing = { inputDelay: number | null; snapshotAge: number | null };
type Sample = Timing & { at: number; fps: number | null; latency: number | null };
export function PerformanceGraph({
  frameRate,
  latency,
  networkTiming,
  showFps,
  showLatency,
}: {
  frameRate: RefObject<number | null>;
  latency: number | null;
  networkTiming: RefObject<Timing>;
  showFps: boolean;
  showLatency: boolean;
}) {
  const {
    ref: dragRef,
    style: dragStyle,
    handleProps: dragHandle,
  } = useDraggable('panel.performance', showFps || showLatency);
  const [samples, setSamples] = useState<Sample[]>([]);
  const roundTrip = useRef(latency);
  useEffect(() => {
    roundTrip.current = latency;
  }, [latency]);
  const visible = showFps || showLatency;
  useEffect(() => {
    if (!visible) {
      return;
    }

    let first = true;
    const timer = setInterval(() => {
      const reset = first;
      first = false;
      const at = performance.now();
      setSamples((previous) => {
        return [
          ...(reset
            ? []
            : previous
                .filter((sample) => {
                  return at - sample.at < PERFORMANCE_SAMPLING.retentionMs;
                })
                .slice(-PERFORMANCE_SAMPLING.previousSamples)),
          { at, fps: frameRate.current, latency: roundTrip.current, ...networkTiming.current },
        ];
      });
    }, PERFORMANCE_SAMPLING.intervalMs);

    return () => {
      return clearInterval(timer);
    };
  }, [visible, frameRate, networkTiming]);

  return (
    <div
      className='performance-stats'
      hidden={!visible}
      ref={dragRef}
      style={dragStyle}
      {...dragHandle}
    >
      <PerformanceMonitor samples={samples} showFps={showFps} showLatency={showLatency} />
    </div>
  );
}
