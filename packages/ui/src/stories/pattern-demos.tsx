import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import {
  GameWindow,
  WorldList,
  ChoiceCard,
  SettingToggle,
  VolumeControl,
  ChapterTabs,
} from '../index';
export function WorldsDemo() {
  const [selectedId, select] = useState<string>();

  return (
    <WorldList
      worlds={[
        { id: '1', name: 'Playtest Default', players: 1, capacity: 32 },
        { id: '2', name: 'The northern grove', players: 3, capacity: 8, locked: true },
        { id: '3', name: 'Full world', players: 8, capacity: 8 },
      ]}
      selectedId={selectedId}
      onJoin={(world) => {
        return select(world.id);
      }}
      latency={42}
    />
  );
}

export function ChoicesDemo() {
  const [selected, select] = useState('Warrior');

  return (
    <Stack spacing={1}>
      {['Warrior', 'Ranger', 'Mage', 'Druid'].map((name) => {
        return (
          <ChoiceCard
            key={name}
            title={name}
            description={
              name === 'Druid' ? 'Roots · Bear companion' : 'A distinct weapon and ability'
            }
            selected={selected === name}
            onSelect={() => {
              return select(name);
            }}
          />
        );
      })}
    </Stack>
  );
}

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

export function ChaptersDemo() {
  const [value, select] = useState('controls');

  return (
    <ChapterTabs
      label='Codex chapters'
      value={value}
      onChange={select}
      chapters={[
        {
          id: 'controls',
          title: 'Controls',
          content: <Typography>Move with WASD or arrows. Press E to interact.</Typography>,
        },
        {
          id: 'combat',
          title: 'Combat',
          content: <Typography>Attacks are automatic. Stay outside enemy warnings.</Typography>,
        },
      ]}
    />
  );
}

export function WindowDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant='contained'
        onClick={() => {
          return setOpen(true);
        }}
      >
        Open window
      </Button>
      <GameWindow
        title='Forest portal'
        open={open}
        onClose={() => {
          return setOpen(false);
        }}
      >
        <Typography>Drag the title to move this window. Escape closes it.</Typography>
        <Button
          onClick={() => {
            return setOpen(false);
          }}
        >
          Continue
        </Button>
      </GameWindow>
    </>
  );
}
