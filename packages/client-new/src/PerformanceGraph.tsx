import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { PerformanceMonitor, useDraggable } from "@emberfall/ui";

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
  } = useDraggable("panel.performance", showFps || showLatency);
  const [samples, setSamples] = useState<Sample[]>([]);
  const roundTrip = useRef(latency);
  useEffect(() => {
    roundTrip.current = latency;
  }, [latency]);
  const visible = showFps || showLatency;
  useEffect(() => {
    if (!visible) return;
    let first = true;
    const timer = setInterval(() => {
      const reset = first;
      first = false;
      const at = performance.now();
      setSamples((previous) => [
        ...(reset ? [] : previous.filter((sample) => at - sample.at < 30000).slice(-59)),
        { at, fps: frameRate.current, latency: roundTrip.current, ...networkTiming.current },
      ]);
    }, 500);
    return () => clearInterval(timer);
  }, [visible, frameRate, networkTiming]);
  return (
    <div
      className="performance-stats"
      hidden={!visible}
      ref={dragRef}
      style={dragStyle}
      {...dragHandle}
    >
      <PerformanceMonitor samples={samples} showFps={showFps} showLatency={showLatency} />
    </div>
  );
}
