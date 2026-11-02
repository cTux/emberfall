import type { SettingToggleProps } from './setting-toggle-props.tsx';
import { FormControlLabel, Switch } from '@mui/material';

// Normalized volume is displayed as a percentage; five-percent steps keep keyboard adjustment practical.

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
