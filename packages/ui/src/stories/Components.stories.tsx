import { useState } from 'react';
import { WorldsDemo, ChoicesDemo, SettingsDemo, ChaptersDemo, WindowDemo } from './pattern-demos';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Typography } from '@mui/material';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons/faBookOpen';
import { faBagShopping } from '@fortawesome/free-solid-svg-icons/faBagShopping';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons/faWandMagicSparkles';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons/faRightFromBracket';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import {
  GameWindow,
  StatusMeter,
  PartyCard,
  WorldList,
  ConnectionStatus,
  HudActions,
  BossHealth,
  InteractionPrompt,
  SceneStatus,
  PortalVote,
  PerformanceMonitor,
} from '../index';

const meta = { title: 'Components/Game patterns', tags: ['autodocs'] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Meter: Story = {
  render: () => {
    return (
      <Stack spacing={2}>
        <StatusMeter label='Health' value={75} max={100} />
        <StatusMeter label='Empty' value={0} max={100} />
        <StatusMeter label='Invalid maximum' value={50} max={0} />
        <StatusMeter label='Fractional' value={75.6} max={100.4} />
      </Stack>
    );
  },
};
export const Party: Story = {
  render: () => {
    return (
      <Stack spacing={1}>
        <PartyCard
          name='Astrid'
          level={1}
          health={75}
          maxHealth={100}
          host
          local
          companion={{ name: 'Bear', health: 150, maxHealth: 150, portrait: '🐻' }}
        />
        <PartyCard name='Bjorn' level={1} health={0} maxHealth={100} away />
      </Stack>
    );
  },
};
export const Worlds: Story = {
  render: WorldsDemo,
};
export const EmptyWorlds: Story = {
  render: () => {
    return <WorldList worlds={[]} onJoin={() => {}} latency={42} />;
  },
};
export const Choices: Story = {
  render: ChoicesDemo,
};
export const Settings: Story = {
  render: SettingsDemo,
};
export const Chapters: Story = {
  render: ChaptersDemo,
};
export const Connection: Story = {
  render: () => {
    return (
      <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
        {(['connected', 'connecting', 'disconnected'] as const).map((status) => {
          return <ConnectionStatus key={status} status={status} />;
        })}
      </Stack>
    );
  },
};
export const Actions: Story = {
  render: () => {
    return (
      <HudActions
        actions={[
          { id: 'inventory', label: 'Inventory', shortcut: 'I', icon: faBagShopping, onClick() {} },
          {
            id: 'talents',
            label: 'Talents',
            shortcut: 'N',
            icon: faWandMagicSparkles,
            onClick() {},
          },
          { id: 'codex', label: 'Codex', shortcut: 'F1', icon: faBookOpen, onClick() {} },
          { id: 'settings', label: 'Settings', shortcut: 'Esc', icon: faGear, onClick() {} },
          {
            id: 'leave',
            label: 'Leave world',
            icon: faRightFromBracket,
            disabled: true,
            onClick() {},
          },
        ]}
      />
    );
  },
};
export const Boss: Story = {
  render: () => {
    return <BossHealth name='The Hollow Warden' health={135} maxHealth={200} />;
  },
};
export const Prompt: Story = {
  render: () => {
    return <InteractionPrompt action='Enter forest portal' />;
  },
};
export const Scene: Story = {
  render: () => {
    return (
      <Stack spacing={2}>
        <SceneStatus label='Forest' seconds={95} />
        <SceneStatus label='Scene complete · Return portal open' />
      </Stack>
    );
  },
};
export const Vote: Story = {
  render: function Vote() {
    const [voted, vote] = useState(false);

    return (
      <PortalVote
        scene='Forest'
        difficulty='Easy'
        ready={voted ? 2 : 1}
        total={2}
        voted={voted}
        onVote={() => {
          return vote(!voted);
        }}
      />
    );
  },
};
export const Countdown: Story = {
  render: () => {
    return (
      <PortalVote
        scene='Forest'
        difficulty='Easy'
        ready={2}
        total={2}
        voted
        countdown={5}
        onVote={() => {}}
      />
    );
  },
};
export const Performance: Story = {
  render: () => {
    return (
      <PerformanceMonitor
        samples={[
          { fps: 60, latency: 30 },
          { fps: 58, latency: 40 },
          { fps: null, latency: null },
          { fps: 59, latency: 35 },
          { fps: 60.4, latency: 32.6 },
        ]}
      />
    );
  },
};
export const Window: Story = {
  render: WindowDemo,
};
export const Panel: Story = {
  render: () => {
    return (
      <GameWindow title='Emberfall' modal={false} onClose={() => {}}>
        <Typography>A nonmodal panel for the world browser and death options.</Typography>
      </GameWindow>
    );
  },
};
