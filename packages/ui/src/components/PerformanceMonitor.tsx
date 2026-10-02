import { Paper, Stack, Typography, useTheme } from "@mui/material";

export interface PerformanceSample {
  fps: number | null;
  latency: number | null;
}
export interface PerformanceMonitorProps {
  samples: PerformanceSample[];
  showFps?: boolean;
  showLatency?: boolean;
}
/** Sampling and clocks belong to the host. This view renders up to 60 supplied samples. */
export function PerformanceMonitor({
  samples,
  showFps = true,
  showLatency = true,
}: PerformanceMonitorProps) {
  const theme = useTheme();
  if (!showFps && !showLatency) return null;
  const recent = samples.slice(-60);
  const current = recent.at(-1);
  const series = (key: "fps" | "latency") => {
    const max = Math.max(
      key === "fps" ? 60 : 100,
      ...recent.map((sample) => (Number.isFinite(sample[key]) ? sample[key]! : 0)),
    );
    let connected = false;
    return recent
      .map((sample, index) => {
        const value = sample[key];
        if (value === null || !Number.isFinite(value)) {
          connected = false;
          return "";
        }
        const point = `${connected ? "L" : "M"}${10 + (index * 240) / Math.max(1, recent.length - 1)},${70 - (Math.max(0, value) / max) * 60}`;
        connected = true;
        return point;
      })
      .join(" ");
  };
  return (
    <Paper component="aside" aria-label="Performance monitor" sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={2}>
        {showFps && <Typography color="success.main">{current?.fps ?? "—"} FPS</Typography>}
        {showLatency && <Typography color="info.main">{current?.latency ?? "—"} ms</Typography>}
      </Stack>
      <svg viewBox="0 0 260 80" role="img" aria-label="Performance history" width="100%">
        {showFps && (
          <path
            data-series="fps"
            d={series("fps")}
            stroke={theme.palette.success.main}
            fill="none"
            strokeWidth="2"
          />
        )}
        {showLatency && (
          <path
            data-series="latency"
            d={series("latency")}
            stroke={theme.palette.info.main}
            fill="none"
            strokeWidth="2"
          />
        )}
      </svg>
    </Paper>
  );
}
