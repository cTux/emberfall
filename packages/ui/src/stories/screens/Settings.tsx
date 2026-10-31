import { useState } from 'react';

import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';

import { GameWindow, ChapterTabs, SettingToggle, VolumeControl } from '../../index';
import { stage, panel } from './styles';

export function Settings() {
  const [tab, setTab] = useState('gameplay');
  const [values, setValues] = useState<Record<string, boolean>>({
    'Floating damage numbers': true,
    'Sound effects': true,
    Music: true,
  });
  const [volume, setVolume] = useState(0.6);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [preset, setPreset] = useState('High');
  const toggles = (labels: string[]) =>
    labels.map((label) => (
      <SettingToggle
        key={label}
        label={label}
        checked={!!values[label]}
        onChange={(checked) => setValues({ ...values, [label]: checked })}
      />
    ));

  return (
    <Box sx={stage}>
      <Box sx={panel}>
        <GameWindow title='Settings' modal={false} height={420} onClose={() => {}}>
          <ChapterTabs
            label='Settings areas'
            value={tab}
            onChange={setTab}
            chapters={[
              {
                id: 'gameplay',
                title: 'Gameplay',
                content: (
                  <Stack>
                    {toggles([
                      'Blood puddles',
                      'Floating damage numbers',
                      'FPS graph',
                      'Latency graph',
                    ])}
                  </Stack>
                ),
              },
              {
                id: 'graphics',
                title: 'Graphics',
                content: (
                  <Stack spacing={2}>
                    <Stack direction='row' spacing={1}>
                      {['Low', 'Balanced', 'High'].map((name) => (
                        <Button
                          key={name}
                          variant={preset === name ? 'contained' : 'outlined'}
                          aria-pressed={preset === name}
                          onClick={() => {
                            setPreset(name);
                            setValues({
                              ...values,
                              'Soft shadows': name !== 'Low',
                              Bloom: name === 'High',
                              'Ambient particles': name !== 'Low',
                              Fog: name !== 'Low',
                            });
                          }}
                        >
                          {name}
                        </Button>
                      ))}
                    </Stack>
                    {toggles(['Soft shadows', 'Bloom', 'Ambient particles', 'Fog'])}
                    <TextField select label='Frame rate limit' defaultValue='0'>
                      {[0, 30, 60, 120, 144].map((fps) => (
                        <MenuItem key={fps} value={String(fps)}>
                          {fps ? `${fps} FPS` : 'Display refresh rate'}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField select label='Render resolution' defaultValue='1'>
                      <MenuItem value='0.75'>75% · Performance</MenuItem>
                      <MenuItem value='1'>100% · Native</MenuItem>
                      <MenuItem value='1.5'>150% · Supersampling</MenuItem>
                    </TextField>
                  </Stack>
                ),
              },
              {
                id: 'sound',
                title: 'Sound',
                content: (
                  <Stack spacing={2}>
                    {toggles(['Sound effects'])}
                    <VolumeControl
                      label='Effects volume'
                      value={volume}
                      onChange={setVolume}
                      disabled={!values['Sound effects']}
                    />
                    {toggles(['Music'])}
                    <VolumeControl
                      label='Music volume'
                      value={musicVolume}
                      onChange={setMusicVolume}
                      disabled={!values.Music}
                    />
                  </Stack>
                ),
              },
            ]}
          />
        </GameWindow>
      </Box>
    </Box>
  );
}
