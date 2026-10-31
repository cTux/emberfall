import { Paper, Stack, Typography, useTheme } from '@mui/material';

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
  if (!showFps && !showLatency) {
    return null;
  }

  const recent = samples.slice(-60);
  const current = recent.at(-1);
  const diagnostics = recent.some((sample) => {
    return sample.inputDelay !== undefined || sample.snapshotAge !== undefined;
  });
  const networkMax = Math.max(
    100,
    ...recent.flatMap((sample) => {
      return [sample.latency, sample.inputDelay, sample.snapshotAge].map((value) => {
        return Number.isFinite(value) ? value! : 0;
      });
    }),
  );
  const series = (key: 'fps' | 'latency' | 'inputDelay' | 'snapshotAge') => {
    const max = Math.max(
      key === 'fps' ? 60 : networkMax,
      ...recent.map((sample) => {
        return Number.isFinite(sample[key]) ? sample[key]! : 0;
      }),
    );
    let connected = false;

    return recent
      .map((sample, index) => {
        const value = sample[key];
        if (value == null || !Number.isFinite(value)) {
          connected = false;

          return '';
        }

        const x =
          sample.at !== undefined && current?.at !== undefined
            ? 10 + ((sample.at - current.at + 30000) * 240) / 30000
            : 10 + (index * 240) / Math.max(1, recent.length - 1);
        const point = `${connected ? 'L' : 'M'}${x},${50 - (Math.max(0, value) / max) * 44}`;
        connected = true;

        return point;
      })
      .join(' ');
  };

  return (
    <Paper component='aside' aria-label='Performance monitor' sx={{ px: 1, py: 0.5 }}>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline' }}>
        {showFps && (
          <Typography variant='caption' aria-label='Frame rate' color='success.main'>
            {current?.fps == null ? '—' : Math.round(current.fps)} FPS
          </Typography>
        )}
        {showLatency && (
          <Typography variant='caption' aria-label='Server latency' color='info.main'>
            {current?.latency == null ? '—' : Math.round(current.latency)} ms
          </Typography>
        )}
        {showLatency && diagnostics && (
          <Typography variant='caption' aria-label='Network scale' color='text.secondary'>
            0–{Math.ceil(networkMax)} ms
          </Typography>
        )}
      </Stack>
      <svg
        viewBox='0 0 260 56'
        role='img'
        aria-label='Performance history over the last 30 seconds'
        width='100%'
        style={{ display: 'block' }}
      >
        {showFps && (
          <path
            data-series='fps'
            d={series('fps')}
            stroke={theme.palette.success.main}
            fill='none'
            strokeWidth='2'
          />
        )}
        {showLatency && (
          <path
            data-series='latency'
            data-value={current?.latency ?? undefined}
            d={series('latency')}
            stroke={theme.palette.info.main}
            fill='none'
            strokeWidth='2'
          />
        )}
        {showLatency && diagnostics && (
          <>
            <path
              data-series='inputDelay'
              data-value={current?.inputDelay ?? undefined}
              aria-label='Input acknowledgement delay'
              d={series('inputDelay')}
              stroke={theme.palette.warning.main}
              fill='none'
              strokeWidth='2'
            />
            <path
              data-series='snapshotAge'
              data-value={current?.snapshotAge ?? undefined}
              aria-label='Snapshot age since receipt'
              d={series('snapshotAge')}
              stroke={theme.palette.boss.main}
              fill='none'
              strokeWidth='2'
            />
          </>
        )}
      </svg>
      {showLatency && diagnostics && (
        <Stack direction='row' sx={{ justifyContent: 'space-between' }}>
          <Typography variant='caption' color='warning.main'>
            Input ack
          </Typography>
          <Typography variant='caption' color='boss.main'>
            Snapshot (local)
          </Typography>
          <Typography variant='caption' color='info.main'>
            Ping
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}
