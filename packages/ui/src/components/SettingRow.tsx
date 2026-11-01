import { FormControlLabel, Slider, Stack, Switch, Typography } from '@mui/material';

// Normalized volume is displayed as a percentage; five-percent steps keep keyboard adjustment practical.
const VOLUME_DISPLAY = { fullPercent: 100, step: 0.05 };

export interface SettingToggleProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}
export function SettingToggle({ label, checked, disabled, onChange }: SettingToggleProps) {
  return (
    <FormControlLabel
      label={label}
      control={
        <Switch
          checked={checked}
          disabled={disabled}
          onChange={(_, value) => {
            return onChange(value);
          }}
        />
      }
    />
  );
}

export interface VolumeControlProps {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}
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
