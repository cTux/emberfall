import { useState } from 'react';
import { ChapterTabs } from '../index';
import { Typography } from '@mui/material';

export function ChaptersDemo() {
  const [value, select] = useState('controls');

  return (
    <ChapterTabs
      label='Codex chapters'
      value={value}
      onChange={select}
      chapters={[
        {
          id: 'controls',
          title: 'Controls',
          content: <Typography>Move with WASD or arrows. Press E to interact.</Typography>,
        },
        {
          id: 'combat',
          title: 'Combat',
          content: <Typography>Attacks are automatic. Stay outside enemy warnings.</Typography>,
        },
      ]}
    />
  );
}
