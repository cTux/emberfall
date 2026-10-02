import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

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
  const current = samples.at(-1);
  const fpsMax = Math.max(60, Math.ceil(Math.max(...samples.map((s) => s.fps ?? 0)) / 60) * 60);
  const latencyMax = Math.max(
    100,
    Math.ceil(
      Math.max(...samples.flatMap((s) => [s.latency ?? 0, s.inputDelay ?? 0, s.snapshotAge ?? 0])) /
        100,
    ) * 100,
  );
  const path = (key: "fps" | "latency" | keyof Timing, max: number) => {
    let penDown = false;
    return samples
      .map((sample) => {
        const value = sample[key];
        if (value === null) {
          penDown = false;
          return "";
        }
        const point = `${penDown ? "L" : "M"}${8 + ((sample.at - (current?.at ?? sample.at) + 30000) * 248) / 30000},${72 - (value / max) * 52}`;
        penDown = true;
        return point;
      })
      .join(" ");
  };
  return (
    <div className="performance-stats" hidden={!visible} aria-label="Performance monitor">
      <svg
        viewBox={showLatency ? "0 0 264 120" : "0 0 264 90"}
        style={{ height: showLatency ? 120 : 90 }}
        role="img"
        aria-label="FPS and latency history over the last 30 seconds"
      >
        <path className="performance-grid" d="M8 20H256 M8 46H256 M8 72H256" />
        {showFps && (
          <>
            <text x="8" y="12" className="performance-fps" aria-label="Frame rate">
              0–{fpsMax} FPS
            </text>
            <path data-series="fps" className="performance-fps" d={path("fps", fpsMax)} />
          </>
        )}
        {showLatency && (
          <>
            <text
              x="256"
              y="12"
              textAnchor="end"
              className="performance-latency"
              aria-label="Server latency"
            >
              Network 0–{latencyMax} ms
            </text>
            <path
              data-series="latency"
              data-value={latency ?? undefined}
              className="performance-latency"
              d={path("latency", latencyMax)}
            />
            <path
              data-series="inputDelay"
              data-value={current?.inputDelay ?? undefined}
              aria-label="Input acknowledgement delay"
              className="performance-input-delay"
              d={path("inputDelay", latencyMax)}
            />
            <path
              data-series="snapshotAge"
              data-value={current?.snapshotAge ?? undefined}
              aria-label="Snapshot age since receipt"
              className="performance-snapshot-age"
              d={path("snapshotAge", latencyMax)}
            />
            <text x="8" y="102" className="performance-input-delay">
              Input ack
            </text>
            <text x="256" y="102" textAnchor="end" className="performance-latency">
              Ping
            </text>
            <text x="8" y="115" className="performance-snapshot-age">
              Snapshot age (local)
            </text>
          </>
        )}
        <text x="8" y="85">
          −30s
        </text>
        <text x="256" y="85" textAnchor="end">
          now
        </text>
      </svg>
    </div>
  );
}
