import { useState } from 'react';

import { Alert, Box, Button, Stack, TextField } from '@mui/material';

import { GameWindow, WorldList, ChapterTabs } from '../../index';
import { stage, panel } from './styles';

export function Lobby() {
  const [tab, setTab] = useState('join');
  const [name, setName] = useState('');
  const [selected, select] = useState<string>();
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(true);
  const join = (
    <Stack spacing={2}>
      <WorldList
        disabled={!name.trim()}
        selectedId={selected}
        worlds={[
          { id: 'open', name: 'Playtest Default', players: 1, capacity: 32 },
          { id: 'locked', name: 'Northern grove', players: 3, capacity: 8, locked: true },
          { id: 'full', name: 'Full world', players: 8, capacity: 8 },
        ]}
        latency={42}
        onJoin={(world) => {
          select(world.id);
          setNotice(world.locked ? '' : `Preview: join ${world.name}`);
        }}
      />
      {selected === 'locked' && (
        <Stack
          component='form'
          spacing={2}
          onSubmit={(event) => {
            event.preventDefault();
            setNotice('Preview: password submitted to the host application');
          }}
        >
          <TextField
            label='Password for Northern grove'
            type='password'
            autoComplete='current-password'
            value={password}
            onChange={(event) => {
              return setPassword(event.target.value);
            }}
          />
          <Button type='submit' variant='contained' disabled={!name.trim()}>
            Join world
          </Button>
        </Stack>
      )}
    </Stack>
  );

  return (
    <Box sx={stage}>
      <Box sx={panel}>
        {open ? (
          <GameWindow
            title='Emberfall'
            modal={false}
            onClose={() => {
              return setOpen(false);
            }}
          >
            <Stack spacing={3}>
              <TextField
                label='Your adventurer name'
                autoComplete='nickname'
                required
                value={name}
                onChange={(event) => {
                  return setName(event.target.value);
                }}
                slotProps={{ htmlInput: { maxLength: 24 } }}
              />
              <ChapterTabs
                label='World actions'
                showHeading={false}
                value={tab}
                onChange={setTab}
                chapters={[
                  { id: 'join', title: 'Join a world', content: join },
                  { id: 'create', title: 'Create a world', disabled: true, content: null },
                ]}
              />
              {notice && (
                <Alert
                  severity='info'
                  onClose={() => {
                    return setNotice('');
                  }}
                >
                  {notice}
                </Alert>
              )}
            </Stack>
          </GameWindow>
        ) : (
          <Button
            onClick={() => {
              return setOpen(true);
            }}
          >
            Open world browser
          </Button>
        )}
      </Box>
    </Box>
  );
}
