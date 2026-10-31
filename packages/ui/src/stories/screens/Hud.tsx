import { Box, Stack } from '@mui/material';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons/faBookOpen';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons/faRightFromBracket';
import {
  PartyCard,
  HudActions,
  ConnectionStatus,
  BossHealth,
  SceneStatus,
  InteractionPrompt,
  PerformanceMonitor,
} from '../../index';
import { stage } from './styles';

export const Hud = () => (
  <Box sx={stage}>
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Stack spacing={1} sx={{ width: '100%', maxWidth: 320 }}>
          <PartyCard name='Astrid' level={1} health={85} maxHealth={100} local host />
          <PartyCard name='Bjorn' level={1} health={100} maxHealth={100} away />
          <PerformanceMonitor
            samples={[
              { fps: 60, latency: 30 },
              { fps: 59, latency: 40 },
              { fps: 60, latency: 34 },
            ]}
          />
        </Stack>
        <HudActions
          actions={[
            { id: 'codex', label: 'Codex', shortcut: 'F1', icon: faBookOpen, onClick() {} },
            { id: 'settings', label: 'Settings', shortcut: 'Esc', icon: faGear, onClick() {} },
            { id: 'leave', label: 'Leave world', icon: faRightFromBracket, onClick() {} },
          ]}
        />
      </Stack>
      <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
        <BossHealth name='The Hollow Warden' health={140} maxHealth={200} />
      </Box>
      <SceneStatus label='Forest' seconds={94} />
      <Box>
        <InteractionPrompt action='Enter forest portal' />
      </Box>
      <ConnectionStatus status='connected' />
    </Stack>
  </Box>
);
