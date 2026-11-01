export function sampleFrameTiming(
  requestFrame: (callback: (now: number) => void) => number = requestAnimationFrame,
  clock: () => number = () => {
    return performance.now();
  },
  cancelFrame: (id: number) => void = cancelAnimationFrame,
) {
  // Three seconds smooths frame jitter; six intervals still allow low-FPS samples.
  const MIN_SAMPLE_MS = 3000;
  // Six intervals provide enough observations to distinguish a stalled loop from sparse frames.
  const MIN_FRAME_INTERVALS = 6;
  // Bound stalled/very slow rendering to fifteen seconds so a benchmark cannot hang.
  const MAX_SAMPLE_MS = 15000;
  // Report the requested 95th-percentile frame-time statistic.
  const P95_QUANTILE = 0.95;

  return new Promise<{ frames: number; averageMs: number; p95Ms: number; sampleMs: number }>(
    (resolve) => {
      const startedAt = clock();
      const intervals: number[] = [];
      let previous: number | undefined;
      let pending: number | undefined;
      let finished = false;
      const deadline = setTimeout(() => {
        return finish(clock());
      }, MAX_SAMPLE_MS);

      function finish(now: number) {
        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(deadline);

        if (pending !== undefined) {
          cancelFrame(pending);
        }

        const sorted = [...intervals].sort((a, b) => {
          return a - b;
        });
        resolve({
          frames: intervals.length,
          averageMs:
            intervals.reduce((sum, n) => {
              return sum + n;
            }, 0) / Math.max(1, intervals.length),
          p95Ms: sorted[Math.floor(sorted.length * P95_QUANTILE)] ?? 0,
          sampleMs: now - startedAt,
        });
      }

      function frame(now: number) {
        if (finished) {
          return;
        }

        if (previous !== undefined && now > previous) {
          intervals.push(now - previous);
        }

        previous = now;
        const sampleMs = now - startedAt;

        if (
          (sampleMs < MIN_SAMPLE_MS || intervals.length < MIN_FRAME_INTERVALS) &&
          sampleMs < MAX_SAMPLE_MS
        ) {
          pending = requestFrame(frame);
        } else {
          finish(now);
        }
      }

      pending = requestFrame(frame);
    },
  );
}
