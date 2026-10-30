import type { Dispatch, SetStateAction } from 'react';
import { GAME_FONTS, SettingToggle, VolumeControl, type GameFont } from '@emberfall/ui';
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { Preferences } from './preferences';
import { GRAPHICS_LABELS, GRAPHICS_PRESETS, type GraphicsSettings } from './graphics';

export function SettingsGraphics({
  preferences,
  setPreferences,
  graphics,
  setGraphics,
}: {
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  graphics: GraphicsSettings;
  setGraphics: Dispatch<SetStateAction<GraphicsSettings>>;
}) {
  return (
    <Stack spacing={2}>
      <TextField
        select
        label='Font'
        value={preferences.font}
        onChange={(e) => setPreferences((p) => ({ ...p, font: e.target.value as GameFont }))}
        helperText='Applies to menus, world labels and damage numbers.'
      >
        {Object.keys(GAME_FONTS).map((font) => (
          <MenuItem key={font} value={font} sx={{ fontFamily: `"${font}", sans-serif` }}>
            {font}
          </MenuItem>
        ))}
      </TextField>
      <VolumeControl
        label='Ability effect transparency'
        value={preferences.abilityEffectTransparency}
        onChange={(abilityEffectTransparency) =>
          setPreferences((p) => ({ ...p, abilityEffectTransparency }))
        }
      />
      <Typography variant='caption' color='text.secondary'>
        0%: fully visible. 100%: invisible. Applies to player ability images and particles.
      </Typography>
      <SettingToggle
        label="Hide other players' ability effects"
        checked={preferences.hideOtherPlayerEffects}
        onChange={(hideOtherPlayerEffects) =>
          setPreferences((p) => ({ ...p, hideOtherPlayerEffects }))
        }
      />
      <Stack direction='row' spacing={1}>
        {Object.entries(GRAPHICS_PRESETS).map(([preset, values]) => (
          <Button
            key={preset}
            variant={JSON.stringify(graphics) === JSON.stringify(values) ? 'contained' : 'outlined'}
            aria-pressed={JSON.stringify(graphics) === JSON.stringify(values)}
            onClick={() => setGraphics({ ...values })}
          >
            {preset}
          </Button>
        ))}
      </Stack>
      <Stack>
        {Object.entries(GRAPHICS_LABELS).map(([key, label]) => (
          <SettingToggle
            key={key}
            label={label}
            checked={graphics[key as keyof typeof GRAPHICS_LABELS]}
            onChange={(checked) => setGraphics((p) => ({ ...p, [key]: checked }))}
          />
        ))}
      </Stack>
      <TextField
        select
        label='Frame rate limit'
        value={graphics.frameLimit}
        onChange={(e) => setGraphics((p) => ({ ...p, frameLimit: Number(e.target.value) }))}
      >
        <MenuItem value={0}>Display refresh rate</MenuItem>
        {[30, 60, 120, 144].map((fps) => (
          <MenuItem key={fps} value={fps}>
            {fps} FPS
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label='Render resolution'
        value={graphics.resolution}
        onChange={(e) => setGraphics((p) => ({ ...p, resolution: Number(e.target.value) }))}
      >
        <MenuItem value={0.75}>75% · Performance</MenuItem>
        <MenuItem value={1}>100% · Native</MenuItem>
        <MenuItem value={1.5}>150% · Supersampling</MenuItem>
      </TextField>
    </Stack>
  );
}
