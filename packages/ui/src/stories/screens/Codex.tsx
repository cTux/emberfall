import { useState } from 'react';

import { Box, Typography } from '@mui/material';

import { GameWindow, ChapterTabs } from '../../index';
import { stage, panel } from './styles';

export function Codex() {
  const [value, select] = useState('controls');

  return (
    <Box sx={stage}>
      <Box sx={{ ...panel, maxWidth: 720 }}>
        <GameWindow title="The Adventurer's Codex" modal={false} onClose={() => {}}>
          <ChapterTabs
            label='Codex chapters'
            value={value}
            onChange={select}
            chapters={[
              {
                id: 'controls',
                title: 'Controls',
                content: (
                  <Typography>
                    WASD or arrow keys to move. E to interact. F1 opens Codex. Escape closes menus
                    or opens Settings.
                  </Typography>
                ),
              },
              {
                id: 'combat',
                title: 'Combat',
                content: (
                  <Typography>
                    Attacks are automatic. Avoid enemy windups. Survive the forest timer and defeat
                    the boss.
                  </Typography>
                ),
              },
              {
                id: 'classes',
                title: 'Classes',
                content: (
                  <Typography>
                    Warrior, Ranger, Mage and Druid have distinct weapons and abilities.
                  </Typography>
                ),
              },
              {
                id: 'credits',
                title: 'Credits',
                content: (
                  <Typography>
                    Game artwork and credits stay with the host. UI font: Alegreya Sans, SIL Open
                    Font License.
                  </Typography>
                ),
              },
            ]}
          />
        </GameWindow>
      </Box>
    </Box>
  );
}
