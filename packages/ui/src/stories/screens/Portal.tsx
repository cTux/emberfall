import { useState } from 'react';

import { Box } from '@mui/material';

import { GameWindow, PortalVote } from '../../index';
import { stage, panel } from './styles';

export function Portal() {
  const [voted, vote] = useState(false);

  return (
    <Box sx={stage}>
      <Box sx={panel}>
        <GameWindow title='Portal' modal={false} onClose={() => {}}>
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
        </GameWindow>
      </Box>
    </Box>
  );
}
