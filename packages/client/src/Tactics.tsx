import { useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons/faArrowUp';
import { faArrowDown } from '@fortawesome/free-solid-svg-icons/faArrowDown';
import { ChapterTabs, SettingToggle } from '@emberfall/ui';
import {
  DEFAULT_TACTICS,
  type ClientMessage,
  type Player,
  type Tactics as TacticsValue,
} from '@emberfall/common';
import { game } from '@emberfall/core';

const labels = {
  nearest: 'Nearest enemy',
  lowestHealth: 'Lowest health %',
  elite: 'Elite / boss first',
  players: 'Players before companions',
  self: 'Self before allies',
};

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
  const update = (patch: Partial<TacticsValue>) =>
    send({
      type: 'setTactics',
      classId: player.classId ?? 'warrior',
      tactics: patch,
    });
  const companion = !!game.registries.classes.require(player.classId ?? 'warrior').companion;
  const priorities = (key: 'offensive' | 'defensive') => (
    <Stack component='ol' spacing={0.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {value[key].map((rule, index) => (
        <Stack
          component='li'
          key={rule}
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center', borderBottom: 1, borderColor: 'divider', py: 0.5 }}
        >
          <Typography color='primary' sx={{ width: 20 }}>
            {index + 1}
          </Typography>
          <Typography sx={{ flex: 1 }}>{labels[rule]}</Typography>
          {([-1, 1] as const).map((direction) => {
            const name = `Move ${labels[rule]} ${direction < 0 ? 'up' : 'down'}`;
            return (
              <Tooltip title={name} key={direction}>
                <span>
                  <IconButton
                    aria-label={name}
                    size='small'
                    disabled={
                      disabled ||
                      player.hitpoints <= 0 ||
                      index + direction < 0 ||
                      index + direction >= value[key].length
                    }
                    onClick={() => {
                      const next = [...value[key]];
                      [next[index], next[index + direction]] = [
                        next[index + direction],
                        next[index],
                      ];
                      update({ [key]: next });
                    }}
                  >
                    <FontAwesomeIcon
                      icon={direction < 0 ? faArrowUp : faArrowDown}
                      aria-hidden='true'
                    />
                  </IconButton>
                </span>
              </Tooltip>
            );
          })}
        </Stack>
      ))}
    </Stack>
  );
  const toggle = (key: 'keepTarget' | 'includeCompanions' | 'avoidHazards', label: string) => (
    <SettingToggle
      label={label}
      checked={value[key]}
      disabled={unavailable || (key === 'avoidHazards' && !companion)}
      onChange={(checked) => update({ [key]: checked })}
    />
  );
  const select = (
    key: 'stance' | 'distance' | 'companionTarget',
    label: string,
    choices: [string, string][],
  ) => (
    <TextField
      select
      fullWidth
      disabled={unavailable || !companion}
      label={label}
      value={value[key]}
      onChange={(event) => update({ [key]: event.target.value })}
    >
      {choices.map(([id, name]) => (
        <MenuItem key={id} value={id}>
          {name}
        </MenuItem>
      ))}
    </TextField>
  );
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
                  onChange={(event) =>
                    update({ healBelow: Number(event.target.value) as TacticsValue['healBelow'] })
                  }
                >
                  {[
                    [1, 'Any missing health'],
                    [0.9, '90% HP'],
                    [0.75, '75% HP'],
                    [0.5, '50% HP'],
                  ].map(([id, name]) => (
                    <MenuItem key={id} value={id}>
                      {name}
                    </MenuItem>
                  ))}
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
                {select('stance', 'Combat stance', [
                  ['balanced', 'Balanced'],
                  ['aggressive', 'Aggressive'],
                  ['protect', 'Protect owner'],
                  ['passive', 'Passive'],
                ])}
                {select('distance', 'Stay near owner', [
                  ['close', 'Close · 100 units'],
                  ['medium', 'Medium · 200 units'],
                  ['far', 'Far · 300 units'],
                ])}
                {select('companionTarget', 'Attack target', [
                  ['priorities', 'Follow offensive priorities'],
                  ['assist', 'Assist my current target'],
                  ['nearOwner', 'Enemies near me'],
                ])}
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
