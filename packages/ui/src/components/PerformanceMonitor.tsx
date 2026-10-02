import { Paper, Stack, Typography, useTheme } from "@mui/material";

export interface PerformanceSample {
  fps: number | null;
  latency: number | null;
  at?: number;
  inputDelay?: number | null;
  snapshotAge?: number | null;
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
  const diagnostics = recent.some(
    (sample) => sample.inputDelay !== undefined || sample.snapshotAge !== undefined,
  );
  const networkMax = Math.max(
    100,
    ...recent.flatMap((sample) =>
      [sample.latency, sample.inputDelay, sample.snapshotAge].map((value) =>
        Number.isFinite(value) ? value! : 0,
      ),
    ),
  );
  const series = (key: "fps" | "latency" | "inputDelay" | "snapshotAge") => {
    const max = Math.max(
      key === "fps" ? 60 : networkMax,
      ...recent.map((sample) => (Number.isFinite(sample[key]) ? sample[key]! : 0)),
    );
    let connected = false;
    return recent
      .map((sample, index) => {
        const value = sample[key];
        if (value == null || !Number.isFinite(value)) {
          connected = false;
          return "";
        }
        const x =
          sample.at !== undefined && current?.at !== undefined
            ? 10 + ((sample.at - current.at + 30000) * 240) / 30000
            : 10 + (index * 240) / Math.max(1, recent.length - 1);
        const point = `${connected ? "L" : "M"}${x},${70 - (Math.max(0, value) / max) * 60}`;
        connected = true;
        return point;
      })
      .join(" ");
  };
  return (
    <Paper component="aside" aria-label="Performance monitor" sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={2}>
        {showFps && (
          <Typography aria-label="Frame rate" color="success.main">
            {current?.fps == null ? "—" : Math.round(current.fps)} FPS
          </Typography>
        )}
        {showLatency && (
          <Typography aria-label="Server latency" color="info.main">
            {current?.latency == null ? "—" : Math.round(current.latency)} ms
          </Typography>
        )}
      </Stack>
      {showLatency && diagnostics && (
        <Typography variant="caption" aria-label="Network scale" color="text.secondary">
          Network 0–{Math.ceil(networkMax)} ms
        </Typography>
      )}
      <svg
        viewBox={diagnostics && showLatency ? "0 0 260 110" : "0 0 260 80"}
        role="img"
        aria-label="Performance history over the last 30 seconds"
        width="100%"
      >
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
            data-value={current?.latency ?? undefined}
            d={series("latency")}
            stroke={theme.palette.info.main}
            fill="none"
            strokeWidth="2"
          />
        )}
        {showLatency && diagnostics && (
          <>
            <path
              data-series="inputDelay"
              data-value={current?.inputDelay ?? undefined}
              aria-label="Input acknowledgement delay"
              d={series("inputDelay")}
              stroke={theme.palette.warning.main}
              fill="none"
              strokeWidth="2"
            />
            <path
              data-series="snapshotAge"
              data-value={current?.snapshotAge ?? undefined}
              aria-label="Snapshot age since receipt"
              d={series("snapshotAge")}
              stroke={theme.palette.boss.main}
              fill="none"
              strokeWidth="2"
            />
            <text x="10" y="92" fill={theme.palette.warning.main}>
              Input ack
            </text>
            <text x="250" y="92" textAnchor="end" fill={theme.palette.info.main}>
              Ping
            </text>
            <text x="10" y="106" fill={theme.palette.boss.main}>
              Snapshot age (local)
            </text>
          </>
        )}
      </svg>
    </Paper>
  );
}
