import { Box, Button, Stack, Typography } from '@mui/material';

import { GameWindow } from '../../index';
import { stage, panel } from './styles';

export const Fallen = () => {
  return (
    <Box sx={stage}>
      <Box sx={panel}>
        <GameWindow title='You have fallen' modal={false} onClose={() => {}}>
          <Stack spacing={2}>
            <Typography>Your party can continue fighting.</Typography>
            <Button variant='contained'>Return to village</Button>
          </Stack>
        </GameWindow>
      </Box>
    </Box>
  );
};
