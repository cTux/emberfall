import type { ClientMessage, WorldSummary } from '@emberfall/common';
import { GameWindow, WorldList, ChapterTabs } from '@emberfall/ui';
import { Box, Stack, TextField, Button } from '@mui/material';

export function WorldBrowser({
  steam,
  name,
  setName,
  tab,
  setTab,
  worlds,
  selected,
  setSelected,
  joinPassword,
  setJoinPassword,
  unavailable,
  latency,
  pending,
  act,
  onClose,
}: {
  steam: boolean;
  name: string;
  setName: (name: string) => void;
  tab: 'browse' | 'create';
  setTab: (tab: 'browse' | 'create') => void;
  worlds: WorldSummary[];
  selected: WorldSummary | null;
  setSelected: (world: WorldSummary | null) => void;
  joinPassword: string;
  setJoinPassword: (password: string) => void;
  unavailable: boolean;
  latency: number | null;
  pending: boolean;
  act: (message: ClientMessage) => void;
  onClose: () => void;
}) {
  return (
    <Box className='lobby'>
      <GameWindow title='Emberfall' modal={false} onClose={onClose}>
        <Stack spacing={3}>
          {!steam && (
            <TextField
              label='Your adventurer name'
              value={name}
              required
              autoComplete='nickname'
              onChange={(e) => {
                return setName(e.target.value);
              }}
              slotProps={{ htmlInput: { maxLength: 24 } }}
            />
          )}
          <ChapterTabs
            label='World actions'
            value={tab}
            showHeading={false}
            onChange={() => {
              setTab('browse');
            }}
            chapters={[
              {
                id: 'browse',
                title: 'Join a world',
                content: (
                  <Stack spacing={2}>
                    <WorldList
                      worlds={worlds}
                      selectedId={selected?.id}
                      disabled={unavailable || !name.trim()}
                      latency={unavailable ? null : latency}
                      onJoin={(w) => {
                        if (w.locked) {
                          setSelected(
                            worlds.find((world) => {
                              return world.id === w.id;
                            })!,
                          );
                          setJoinPassword('');
                        } else {
                          act({
                            type: 'join',
                            worldId: w.id,
                            playerName: name,
                            password: '',
                          });
                        }
                      }}
                    />
                    {selected && (
                      <Stack
                        component='form'
                        spacing={2}
                        onSubmit={(e) => {
                          e.preventDefault();
                          act({
                            type: 'join',
                            worldId: selected.id,
                            playerName: name,
                            password: joinPassword,
                          });
                        }}
                      >
                        <TextField
                          label={`Password for ${selected.name}`}
                          type='password'
                          autoComplete='current-password'
                          value={joinPassword}
                          onChange={(e) => {
                            return setJoinPassword(e.target.value);
                          }}
                          slotProps={{ htmlInput: { maxLength: 64 } }}
                        />
                        <Button
                          type='submit'
                          variant='contained'
                          disabled={unavailable || !name.trim()}
                        >
                          {pending ? 'Joining…' : 'Join world'}
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                ),
              },
              {
                id: 'create',
                title: 'Create a world',
                disabled: true,
                content: null,
              },
            ]}
          />
        </Stack>
      </GameWindow>
    </Box>
  );
}
