import { Stack, Typography, Tooltip, IconButton } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons/faArrowUp';
import { faArrowDown } from '@fortawesome/free-solid-svg-icons/faArrowDown';
import { TACTICS_LABELS, type TacticsPriority } from './tactics-controls';

export function TacticsPriorities({
  rules,
  disabled,
  onMove,
}: {
  rules: readonly TacticsPriority[];
  disabled: boolean;
  onMove: (rule: TacticsPriority, direction: -1 | 1) => void;
}) {
  return (
    <Stack component='ol' spacing={0.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {rules.map((rule, index) => (
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
          <Typography sx={{ flex: 1 }}>{TACTICS_LABELS[rule]}</Typography>
          {([-1, 1] as const).map((direction) => {
            const name = `Move ${TACTICS_LABELS[rule]} ${direction < 0 ? 'up' : 'down'}`;
            return (
              <Tooltip title={name} key={direction}>
                <span>
                  <IconButton
                    aria-label={name}
                    size='small'
                    disabled={
                      disabled || index + direction < 0 || index + direction >= rules.length
                    }
                    onClick={() => onMove(rule, direction)}
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
}
