import { TacticsPriorities } from './TacticsPriorities';
import { POSITIONING_CONTROLS } from './tactics-controls';
import { Fragment, useState } from 'react';
import { Box, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ChapterTabs, SettingToggle } from '@emberfall/ui';
import {
  DEFAULT_TACTICS,
  type ClientMessage,
  type Player,
  type Tactics as TacticsValue,
} from '@emberfall/common';
import { game } from '@emberfall/core';

export function Tactics({
  player,
  send,
  disabled,
}: {
  player: Player;
  send: (message: ClientMessage) => void;
  disabled: boolean;
}) {
  const [tab, setTab] = useState('offensive');
  const value = player.tactics ?? DEFAULT_TACTICS;
  const unavailable = disabled || player.hitpoints <= 0;
  const update = (patch: Partial<TacticsValue>) => {
    return send({
      type: 'setTactics',
      classId: player.classId ?? 'warrior',
      tactics: patch,
    });
  };

  const companion = !!game.registries.classes.require(player.classId ?? 'warrior').companion;
  const priorities = (key: 'offensive' | 'defensive') => {
    return (
      <TacticsPriorities
        rules={value[key]}
        disabled={unavailable}
        onMove={(rule, direction) => {
          return send({
            type: 'moveTacticsPriority',
            classId: player.classId ?? 'warrior',
            list: key,
            rule,
            direction,
          });
        }}
      />
    );
  };

  const toggle = (key: 'keepTarget' | 'includeCompanions' | 'avoidHazards', label: string) => {
    return (
      <SettingToggle
        label={label}
        checked={value[key]}
        disabled={unavailable || (key === 'avoidHazards' && !companion)}
        onChange={(checked) => {
          return update({ [key]: checked });
        }}
      />
    );
  };

  const select = (
    key: 'stance' | 'distance' | 'companionTarget',
    label: string,
    choices: readonly (readonly [string, string])[],
  ) => {
    return (
      <TextField
        select
        fullWidth
        disabled={unavailable || !companion}
        label={label}
        value={value[key]}
        onChange={(event) => {
          return update({ [key]: event.target.value });
        }}
      >
        {choices.map(([id, name]) => {
          return (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          );
        })}
      </TextField>
    );
  };

  return (
    <ChapterTabs
      label='Tactics sections'
      value={tab}
      onChange={setTab}
      showHeading={false}
      chapters={[
        {
          id: 'offensive',
          title: 'Offensive',
          content: (
            <Stack spacing={1.5}>
              <Typography variant='body2' color='text.secondary'>
                Choose who automatic attacks and aimed spells prefer.
              </Typography>
              <Typography component='h3' variant='h3'>
                Target priority
              </Typography>
              <Box
                component='fieldset'
                disabled={disabled || player.hitpoints <= 0}
                sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
              >
                {priorities('offensive')}
                {toggle('keepTarget', 'Keep target until defeated or invalid')}
              </Box>
              <Typography variant='body2' color='text.secondary'>
                Top rule wins; lower rules break ties. Bosses rank before elites. Only living
                enemies in the spell’s range qualify.
              </Typography>
              <Divider />
              <Typography variant='body2' color='text.secondary'>
                Manual aim stays manual when auto-target is off. Self-centered spells keep their own
                behavior.
              </Typography>
            </Stack>
          ),
        },
        {
          id: 'defensive',
          title: 'Defensive',
          content: (
            <Stack spacing={1.5}>
              <Typography variant='body2' color='text.secondary'>
                Choose who targeted healing spells prefer.
              </Typography>
              <Typography component='h3' variant='h3'>
                Healing priority
              </Typography>
              <Stack
                component='fieldset'
                disabled={disabled || player.hitpoints <= 0}
                spacing={1.5}
                sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
              >
                {priorities('defensive')}
                <TextField
                  select
                  fullWidth
                  disabled={unavailable}
                  label='Auto-heal below'
                  value={value.healBelow}
                  onChange={(event) => {
                    return update({
                      healBelow: Number(event.target.value) as TacticsValue['healBelow'],
                    });
                  }}
                >
                  {[
                    [1, 'Any missing health'],
                    [0.9, '90% HP'],
                    [0.75, '75% HP'],
                    [0.5, '50% HP'],
                  ].map(([id, name]) => {
                    return (
                      <MenuItem key={id} value={id}>
                        {name}
                      </MenuItem>
                    );
                  })}
                </TextField>
                {toggle('includeCompanions', 'Include companions')}
              </Stack>
              <Divider />
              <Typography variant='body2' color='text.secondary'>
                Living, injured party members in range only. The threshold applies to automatic
                healing casts. Manual casts, self-heals and fixed-target effects retain their rules.
              </Typography>
            </Stack>
          ),
        },
        {
          id: 'positioning',
          title: 'Positioning',
          content: (
            <Stack spacing={2}>
              <Typography variant='body2' color='text.secondary'>
                {companion
                  ? 'Control your companion’s combat behavior.'
                  : 'Your current class has no companion. These controls become available for companion classes.'}
              </Typography>
              <Stack
                component='fieldset'
                disabled={disabled || player.hitpoints <= 0 || !companion}
                spacing={2}
                sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
              >
                {POSITIONING_CONTROLS.map(({ key, label, choices }) => {
                  return <Fragment key={key}>{select(key, label, choices)}</Fragment>;
                })}
                {toggle('avoidHazards', 'Avoid telegraphs and projectiles')}
              </Stack>
              <Divider />
              <Typography variant='body2' color='text.secondary'>
                Balanced hunts within 200 units. Aggressive uses the full selected distance. Protect
                owner stays within 100 units. Passive follows without attacking. The owner tether
                always applies; assist falls back to your priorities.
              </Typography>
            </Stack>
          ),
        },
      ]}
    />
  );
}
