import { useState } from 'react';
import { Stack } from '@mui/material';
import { ChoiceCard } from '../index';

export function ChoicesDemo() {
  const [selected, select] = useState('Warrior');

  return (
    <Stack spacing={1}>
      {['Warrior', 'Ranger', 'Mage', 'Druid'].map((name) => {
        return (
          <ChoiceCard
            key={name}
            title={name}
            description={
              name === 'Druid' ? 'Roots · Bear companion' : 'A distinct weapon and ability'
            }
            selected={selected === name}
            onSelect={() => {
              return select(name);
            }}
          />
        );
      })}
    </Stack>
  );
}
