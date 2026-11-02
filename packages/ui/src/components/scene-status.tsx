import { Typography } from '@mui/material';

// A minute contains sixty seconds; pad seconds to two digits for the mm:ss timer.
const SCENE_CLOCK = { secondsPerMinute: 60, secondsDigits: 2 };

export function SceneStatus({ label, seconds }: { label: string; seconds?: number }) {
  const time =
    seconds === undefined
      ? undefined
      : Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));

  return (
    <Typography role='status' color='primary'>
      {label}
      {time === undefined
        ? ''
        : ` · ${Math.floor(time / SCENE_CLOCK.secondsPerMinute)}:${String(time % SCENE_CLOCK.secondsPerMinute).padStart(SCENE_CLOCK.secondsDigits, '0')}`}
    </Typography>
  );
}
