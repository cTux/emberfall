import type { VolumeControlProps } from './volume-control-props.tsx';
import { Stack, Typography, Slider } from '@mui/material';

// Normalized volume is displayed as a percentage; five-percent steps keep keyboard adjustment practical.

// Normalized volume is displayed as a percentage; five-percent steps keep keyboard adjustment practical.
const VOLUME_DISPLAY = { fullPercent: 100, step: 0.05 };

export function VolumeControl({ label, value, disabled, onChange }: VolumeControlProps) {
  return (
    <Stack spacing={1}>
      <Typography>{label}</Typography>
      <Slider
        aria-label={label}
        value={value}
        min={0}
        max={1}
        step={VOLUME_DISPLAY.step}
        disabled={disabled}
        valueLabelDisplay='auto'
        valueLabelFormat={(volume) => {
          return `${Math.round(volume * VOLUME_DISPLAY.fullPercent)}%`;
        }}
        getAriaValueText={(volume) => {
          return `${Math.round(volume * VOLUME_DISPLAY.fullPercent)}%`;
        }}
        onChange={(_, next) => {
          return onChange(next);
        }}
      />
    </Stack>
  );
}
