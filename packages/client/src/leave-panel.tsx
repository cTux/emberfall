import type { Actions } from './actions.tsx';
import type { Player, ClientMessage } from '@emberfall/common';
import { Typography, Stack, Button } from '@mui/material';

export function LeavePanel({
  me,
  unavailable,
  send,
  act,
  onClose,
}: Actions & { me?: Player; act: (message: ClientMessage) => void }) {
  return (
    <>
      <Typography>
        {me?.scene === 'forest'
          ? 'Are you sure you want to leave the current game? Your party will continue.'
          : 'Are you sure you want to leave the lobby?'}
      </Typography>
      <Stack direction='row' spacing={1}>
        <Button variant='outlined' onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant='contained'
          color='error'
          disabled={unavailable}
          onClick={() => {
            if (me?.scene === 'forest') {
              send({ type: 'leaveScene' });
            } else {
              act({ type: 'leave' });
            }

            onClose();
          }}
        >
          Leave
        </Button>
      </Stack>
    </>
  );
}
