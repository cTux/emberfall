import { FormControlLabel, Slider, Stack, Switch, Typography } from "@mui/material";

export interface SettingToggleProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange(checked: boolean): void;
}
export function SettingToggle({ label, checked, disabled, onChange }: SettingToggleProps) {
  return (
    <FormControlLabel
      label={label}
      control={
        <Switch checked={checked} disabled={disabled} onChange={(_, value) => onChange(value)} />
      }
    />
  );
}
export interface VolumeControlProps {
  label: string;
  value: number;
  disabled?: boolean;
  onChange(value: number): void;
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
        step={0.05}
        disabled={disabled}
        valueLabelDisplay="auto"
        valueLabelFormat={(volume) => `${Math.round(volume * 100)}%`}
        getAriaValueText={(volume) => `${Math.round(volume * 100)}%`}
        onChange={(_, next) => onChange(next as number)}
      />
    </Stack>
  );
}
