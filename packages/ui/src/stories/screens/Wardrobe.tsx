import { useState } from 'react';

import { Box, Typography } from '@mui/material';

import { GameWindow, ClassCard } from '../../index';
import { stage, panel } from './styles';

export function Wardrobe() {
  const [selected, select] = useState('Warrior');
  return (
    <Box sx={stage}>
      <Box sx={{ ...panel, maxWidth: 600 }}>
        <GameWindow title='Wardrobe' width={600} modal={false} onClose={() => {}}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: { xs: 0.5, sm: 1 },
            }}
          >
            {Object.entries({
              Warrior: 'Slashing sword · Bleeding',
              Ranger: 'Piercing arrows · Poison',
              Mage: 'Twin fireballs · Burning',
              Druid: 'Roots · Bear companion',
            }).map(([name, description]) => (
              <ClassCard
                key={name}
                title={name}
                portrait={
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography variant='h2'>{name[0]}</Typography>
                  </Box>
                }
                weapon={{
                  name: name === 'Warrior' ? 'Sword' : name === 'Ranger' ? 'Bow' : 'Staff',
                  icon: <Typography>W</Typography>,
                  description,
                }}
                spell={{
                  name:
                    name === 'Warrior'
                      ? 'Slash'
                      : name === 'Ranger'
                        ? 'Piercing arrows'
                        : name === 'Mage'
                          ? 'Fireball'
                          : 'Roots',
                  icon: <Typography>S</Typography>,
                  description: `${description}. Cooldown: 0.7 seconds.`,
                }}
                stats={{ level: 1, experience: 0, maxHitpoints: 100, power: 5 }}
                selected={selected === name}
                onSelect={() => select(name)}
              />
            ))}
          </Box>
        </GameWindow>
      </Box>
    </Box>
  );
}
