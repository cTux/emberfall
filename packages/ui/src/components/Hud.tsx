import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { StatusMeter } from './StatusMeter';
import { BossHealthStyled, HudActionButtonStyled, HudShortcutStyled } from './styles';

export function ConnectionStatus({
  status,
}: {
  status: 'connected' | 'connecting' | 'disconnected';
}) {
  return (
    <Box
      component='span'
      role='status'
      aria-label={status === 'connected' ? 'World server online' : `World server ${status}`}
      sx={{
        display: 'block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor:
          status === 'connected'
            ? 'success.main'
            : status === 'connecting'
              ? 'warning.main'
              : 'error.main',
      }}
    />
  );
}

export interface HudAction {
  id: string;
  label: string;
  shortcut?: string;
  icon: IconDefinition;
  disabled?: boolean;
  onClick: () => void;
}
export function HudActions({ actions }: { actions: HudAction[] }) {
  return (
    <Stack component='nav' aria-label='Game controls' direction='row' spacing={1}>
      {actions.map((action) => (
        <Tooltip
          title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
          key={action.id}
        >
          <span>
            <HudActionButtonStyled
              aria-label={action.label}
              aria-keyshortcuts={action.shortcut === 'Esc' ? 'Escape' : action.shortcut}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              <FontAwesomeIcon icon={action.icon} aria-hidden='true' />
              {action.shortcut && (
                <HudShortcutStyled aria-hidden='true'>{action.shortcut}</HudShortcutStyled>
              )}
            </HudActionButtonStyled>
          </span>
        </Tooltip>
      ))}
    </Stack>
  );
}

export function BossHealth({
  name,
  health,
  maxHealth,
}: {
  name: string;
  health: number;
  maxHealth: number;
}) {
  return (
    <BossHealthStyled as='aside' aria-label='Boss health'>
      <Typography variant='h3' component='h3' gutterBottom>
        {name}
      </Typography>
      <StatusMeter label={`${name} HP`} value={health} max={maxHealth} color='boss' centered />
    </BossHealthStyled>
  );
}

export function InteractionPrompt({ action, keys = 'E' }: { action: string; keys?: string }) {
  return <Chip role='status' variant='outlined' label={`${keys} · ${action}`} />;
}

export function SceneStatus({ label, seconds }: { label: string; seconds?: number }) {
  const time =
    seconds === undefined
      ? undefined
      : Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));

  return (
    <Typography role='status' color='primary'>
      {label}
      {time === undefined
        ? ''
        : ` · ${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`}
    </Typography>
  );
}
