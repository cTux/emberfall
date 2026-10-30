import { clientAsset } from './urls.ts';
import type { Dispatch, SetStateAction } from 'react';
import {
  ChapterTabs,
  SettingToggle,
  VolumeControl,
  GAME_FONTS,
  type GameFont,
} from '@emberfall/ui';
import { Button, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { Preferences } from './preferences';
import { GRAPHICS_LABELS, GRAPHICS_PRESETS, type GraphicsSettings } from './graphics';
import type { AccountView } from '@emberfall/common';

export function Settings({
  tab,
  onTab,
  preferences,
  setPreferences,
  graphics,
  setGraphics,
  account,
  onRename,
  onLogout,
}: {
  tab: string;
  onTab: (tab: string) => void;
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  graphics: GraphicsSettings;
  setGraphics: Dispatch<SetStateAction<GraphicsSettings>>;
  account: AccountView;
  onRename: () => void;
  onLogout: () => void;
}) {
  const toggle = (
    key:
      | 'customCursor'
      | 'autoAttack'
      | 'autoTarget'
      | 'autoLoot'
      | 'lootHints'
      | 'hideGatheringHintInCombat'
      | 'hideHealthBarsInTown'
      | 'bloodPuddles'
      | 'damageNumbers'
      | 'hideOtherPlayerDamageNumbers'
      | 'dps'
      | 'fps'
      | 'latency'
      | 'debugHitboxes'
      | 'sound'
      | 'music',
    label: string,
  ) => (
    <SettingToggle
      key={key}
      label={label}
      checked={preferences[key]}
      onChange={(checked) => setPreferences((p) => ({ ...p, [key]: checked }))}
    />
  );
  return (
    <ChapterTabs
      label='Settings areas'
      value={tab}
      onChange={onTab}
      showHeading={false}
      chapters={[
        ...(account.mode === 'steam'
          ? [
              {
                id: 'account',
                title: 'Account',
                content: (
                  <Stack spacing={2}>
                    <Typography>Nickname: {account.nickname}</Typography>
                    <Button onClick={onRename}>Change nickname</Button>
                    <Button onClick={onLogout}>Sign out of Steam account</Button>
                  </Stack>
                ),
              },
            ]
          : []),
        {
          id: 'gameplay',
          title: 'Gameplay',
          content: (
            <Stack>
              {toggle('customCursor', 'Custom cursor')}
              <TextField
                select
                label='Cursor size'
                value={preferences.cursorSize}
                disabled={!preferences.customCursor}
                onChange={(e) =>
                  setPreferences((p) => ({
                    ...p,
                    cursorSize: Number(e.target.value) as Preferences['cursorSize'],
                  }))
                }
                sx={{ my: 1 }}
              >
                <MenuItem value={32}>Small · 32 px</MenuItem>
                <MenuItem value={48}>Medium · 48 px</MenuItem>
                <MenuItem value={64}>Large · 64 px</MenuItem>
              </TextField>
              {toggle('autoAttack', 'Auto-attack (F)')}
              {toggle('autoTarget', 'Auto-target (G)')}
              {toggle('autoLoot', 'Auto-loot items')}
              <Typography variant='caption' color='text.secondary'>
                Automatically collect nearby item drops. XP and gold are always collected.
              </Typography>
              {toggle('lootHints', 'Loot hints')}
              {toggle('bloodPuddles', 'Blood puddles')}
              {toggle('hideGatheringHintInCombat', 'Hide interact hint during combat')}
              {toggle('hideHealthBarsInTown', 'Hide health bars in town')}
              {toggle('damageNumbers', 'Floating damage numbers')}
              {toggle('hideOtherPlayerDamageNumbers', "Hide other players' damage numbers")}
              {toggle('dps', 'DPS meter')}
              {toggle('fps', 'FPS graph')}
              {toggle('latency', 'Latency graph')}
              {toggle('debugHitboxes', 'Debug mode: show hitboxes')}
              <Typography variant='caption' color='text.secondary'>
                Body hitboxes, scenery collisions and labeled interaction ranges. Decorative
                entities have no hitboxes. Overlays follow displayed positions; the server decides
                hits. Cyan: whole-model bodies. Magenta: projectiles. Yellow: scenery. Orange:
                ranges.
              </Typography>
            </Stack>
          ),
        },
        {
          id: 'graphics',
          title: 'Graphics',
          content: (
            <Stack spacing={2}>
              <TextField
                select
                label='Font'
                value={preferences.font}
                onChange={(e) =>
                  setPreferences((p) => ({ ...p, font: e.target.value as GameFont }))
                }
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
                    variant={
                      JSON.stringify(graphics) === JSON.stringify(values) ? 'contained' : 'outlined'
                    }
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
          ),
        },
        {
          id: 'sound',
          title: 'Sound',
          content: (
            <Stack spacing={2}>
              {toggle('sound', 'Sound effects')}
              <VolumeControl
                label='Effects volume'
                value={preferences.volume}
                disabled={!preferences.sound}
                onChange={(volume) => setPreferences((p) => ({ ...p, volume }))}
              />
              {toggle('music', 'Music')}
              <VolumeControl
                label='Music volume'
                value={preferences.musicVolume}
                disabled={!preferences.music}
                onChange={(musicVolume) => setPreferences((p) => ({ ...p, musicVolume }))}
              />
              <Typography variant='caption' color='text.secondary'>
                Music: TimberwolfGames · Sound effects: Ninja Adventure.{' '}
                <Link href={clientAsset('/audio/CREDITS.txt')} target='_blank' rel='noreferrer'>
                  Audio credits
                </Link>
              </Typography>
            </Stack>
          ),
        },
      ]}
    />
  );
}
