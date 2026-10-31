export function sampleFrameTiming(
  requestFrame: (callback: (now: number) => void) => number = requestAnimationFrame,
  clock: () => number = () => {
    return performance.now();
  },
  cancelFrame: (id: number) => void = cancelAnimationFrame,
) {
  return new Promise<{ frames: number; averageMs: number; p95Ms: number; sampleMs: number }>(
    (resolve) => {
      const startedAt = clock();
      const intervals: number[] = [];
      let previous: number | undefined;
      let pending: number | undefined;
      let finished = false;
      const deadline = setTimeout(() => {
        return finish(clock());
      }, 15000);

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
          p95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
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

        if ((sampleMs < 3000 || intervals.length < 6) && sampleMs < 15000) {
          pending = requestFrame(frame);
        } else {
          finish(now);
        }
      }

      pending = requestFrame(frame);
    },
  );
}
