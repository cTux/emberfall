import { SettingsGraphics } from './SettingsGraphics';
import { GAMEPLAY_CONTROLS, SOUND_CONTROLS, type BooleanPreference } from './settings-controls';
import { clientAsset } from './urls.ts';
import { memo, Fragment, type Dispatch, type SetStateAction } from 'react';
import { ChapterTabs, SettingToggle, VolumeControl } from '@emberfall/ui';
import { Button, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { Preferences } from './preferences';
import type { GraphicsSettings } from './graphics';
import type { AccountView } from '@emberfall/common';

function SettingsView({
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
  const toggle = (key: BooleanPreference, label: string) => {
    return (
      <SettingToggle
        key={key}
        label={label}
        checked={preferences[key]}
        onChange={(checked) => {
          return setPreferences((p) => {
            return { ...p, [key]: checked };
          });
        }}
      />
    );
  };

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
                onChange={(e) => {
                  return setPreferences((p) => {
                    return {
                      ...p,
                      cursorSize: Number(e.target.value) as Preferences['cursorSize'],
                    };
                  });
                }}
                sx={{ my: 1 }}
              >
                <MenuItem value={32}>Small · 32 px</MenuItem>
                <MenuItem value={48}>Medium · 48 px</MenuItem>
                <MenuItem value={64}>Large · 64 px</MenuItem>
              </TextField>
              {GAMEPLAY_CONTROLS.map(({ key, label, description }) => {
                return (
                  <Fragment key={key}>
                    {toggle(key, label)}
                    {description && (
                      <Typography variant='caption' color='text.secondary'>
                        {description}
                      </Typography>
                    )}
                  </Fragment>
                );
              })}
            </Stack>
          ),
        },
        {
          id: 'graphics',
          title: 'Graphics',
          content: (
            <SettingsGraphics
              preferences={preferences}
              setPreferences={setPreferences}
              graphics={graphics}
              setGraphics={setGraphics}
            />
          ),
        },
        {
          id: 'sound',
          title: 'Sound',
          content: (
            <Stack spacing={2}>
              {SOUND_CONTROLS.map(({ key, label, volume, volumeLabel }) => {
                return (
                  <Fragment key={key}>
                    {toggle(key, label)}
                    <VolumeControl
                      label={volumeLabel}
                      value={preferences[volume]}
                      disabled={!preferences[key]}
                      onChange={(value) => {
                        return setPreferences((p) => {
                          return { ...p, [volume]: value };
                        });
                      }}
                    />
                  </Fragment>
                );
              })}
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

export const Settings = memo(SettingsView);
