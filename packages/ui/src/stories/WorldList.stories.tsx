import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box } from '@mui/material';
import { ChapterTabs, GameWindow, WorldList } from '../index';

// Reproduce the compact desktop browser with its external tab rail.
const COMPACT_LOBBY_WIDTH_PX = 440;

const meta = {
  title: 'Components/WorldList',
  component: WorldList,
  tags: ['autodocs'],
  args: {
    worlds: [{ id: '1', name: 'Northern grove', players: 3, capacity: 8, locked: true }],
    disabled: false,
    onJoin: () => {},
    latency: 42,
  },
} satisfies Meta<typeof WorldList>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};

export const CompactLobby: StoryObj<typeof meta> = {
  render: (args) => {
    return (
      <Box sx={{ width: COMPACT_LOBBY_WIDTH_PX, maxWidth: '100%' }}>
        <GameWindow title='Emberfall' modal={false} onClose={() => {}}>
          <ChapterTabs
            label='World actions'
            value='join'
            showHeading={false}
            onChange={() => {}}
            chapters={[
              { id: 'join', title: 'Join a world', content: <WorldList {...args} /> },
              { id: 'create', title: 'Create a world', disabled: true, content: null },
            ]}
          />
        </GameWindow>
      </Box>
    );
  },
  args: {
    worlds: [
      { id: 'open', name: 'Playtest Default', players: 0, capacity: 32 },
      {
        id: 'locked',
        name: 'A very long password-protected world name',
        players: 12,
        capacity: 32,
        locked: true,
      },
    ],
    latency: 1234,
  },
};

export const RowInteraction: StoryObj<typeof meta> = {
  render: function RowInteraction(args) {
    const [joins, setJoins] = useState(0);

    return (
      <>
        <WorldList
          {...args}
          onJoin={() => {
            return setJoins((count) => {
              return count + 1;
            });
          }}
        />
        <p role='status'>Joins: {joins}</p>
      </>
    );
  },
  args: {
    worlds: [
      { id: 'open', name: 'Northern grove', players: 3, capacity: 8, locked: true },
      { id: 'full', name: 'Full world', players: 8, capacity: 8 },
    ],
  },
};

export const Disabled: StoryObj<typeof meta> = {
  ...RowInteraction,
  args: { ...RowInteraction.args, disabled: true },
};

export const Empty: StoryObj<typeof meta> = { args: { worlds: [] } };
export const Full: StoryObj<typeof meta> = {
  args: {
    worlds: [{ id: '1', name: 'Playtest Default', players: 32, capacity: 32 }],
    latency: null,
  },
};
