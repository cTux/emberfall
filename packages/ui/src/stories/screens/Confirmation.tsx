import { useState } from 'react';

import { Box, Button, Stack, Typography } from '@mui/material';

import { GameWindow } from '../../index';
import { stage } from './styles';

export function Confirmation() {
  const [open, setOpen] = useState(true);

  return (
    <Box sx={stage}>
      <Button
        onClick={() => {
          return setOpen(true);
        }}
      >
        Leave scene
      </Button>
      <GameWindow
        title='Leave the forest?'
        open={open}
        onClose={() => {
          return setOpen(false);
        }}
      >
        <Stack spacing={3}>
          <Typography>Your party can continue fighting.</Typography>
          <Stack direction='row' spacing={1}>
            <Button
              variant='outlined'
              onClick={() => {
                return setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              color='error'
              variant='contained'
              onClick={() => {
                return setOpen(false);
              }}
            >
              Leave scene
            </Button>
          </Stack>
        </Stack>
      </GameWindow>
    </Box>
  );
}
