import { useState } from 'react';
import { Stack } from '@mui/material';
import { SettingToggle, VolumeControl } from '../index';

export function SettingsDemo() {
  const [checked, toggle] = useState(true);
  const [volume, setVolume] = useState(0.6);

  return (
    <Stack spacing={2}>
      <SettingToggle label='Sound effects' checked={checked} onChange={toggle} />
      <VolumeControl
        label='Effects volume'
        value={volume}
        onChange={setVolume}
        disabled={!checked}
      />
      <SettingToggle label='Unavailable setting' checked={false} disabled onChange={() => {}} />
    </Stack>
  );
}
