import { Alert, Box } from '@mui/material';

import { GameWindow } from '../../index';
import { stage, panel } from './styles';

export const Service = () => {
  return (
    <Box sx={stage}>
      <Box sx={panel}>
        <GameWindow title='Blacksmith' modal={false} onClose={() => {}}>
          <Alert severity='info'>Blacksmith services are coming in a future update.</Alert>
        </GameWindow>
      </Box>
    </Box>
  );
};
