import { useState } from 'react';
import { Button, Typography } from '@mui/material';
import { GameWindow } from '../index';

export function WindowDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant='contained'
        onClick={() => {
          return setOpen(true);
        }}
      >
        Open window
      </Button>
      <GameWindow
        title='Portal'
        open={open}
        onClose={() => {
          return setOpen(false);
        }}
      >
        <Typography>Drag the title to move this window. Escape closes it.</Typography>
        <Button
          onClick={() => {
            return setOpen(false);
          }}
        >
          Continue
        </Button>
      </GameWindow>
    </>
  );
}
