import type { Actions } from './CharacterPanels-actions.tsx';
import type { Player } from '@emberfall/common';
import { Typography, Box, Stack, Button } from '@mui/material';
import { GoldBalance } from '@emberfall/ui';
import { TALENT_RESET_COST, availableTalentPoints, TALENT_POINT_CAP } from '@emberfall/core';

export function ResetTalentsPanel({
  me,
  unavailable,
  send,
  onClose,
}: Actions & { me: Player; onClose: () => void }) {
  return (
    <>
      <Typography component='div'>
        Do you really want to reset your talent points for{' '}
        <Box
          component='span'
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            verticalAlign: 'middle',
            whiteSpace: 'nowrap',
          }}
        >
          <GoldBalance name='Reset cost' coins={TALENT_RESET_COST} />?
        </Box>
      </Typography>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant='body2'>Currently you have:</Typography>
        <GoldBalance name='Your balance' coins={me.coins ?? 0} />
      </Stack>
      <Stack direction='row' spacing={1}>
        <Button variant='outlined' onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant='contained'
          disabled={
            unavailable ||
            (me.coins ?? 0) < TALENT_RESET_COST ||
            availableTalentPoints(me) >= Math.min(TALENT_POINT_CAP, me.level) - 1
          }
          onClick={() => {
            send({ type: 'resetTalents', classId: me.classId ?? 'warrior' });
            onClose();
          }}
        >
          Reset talents
        </Button>
      </Stack>
    </>
  );
}
