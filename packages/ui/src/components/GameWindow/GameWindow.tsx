import { useId, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton, Paper, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { useDraggable } from '../../useDraggable';
import { WindowFrameStyled, WindowTabsStyled, WindowTitleStyled } from './styles';
import { WindowTabsContext } from './WindowTabsContext';

export interface GameWindowProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  open?: boolean;
  modal?: boolean;
  height?: number;
  width?: number;
  positionKey?: string;
}

/** Focus trapping and Escape come from MUI; the host can persist drag positions. */
export function GameWindow({
  title,
  children,
  onClose,
  open = true,
  modal = true,
  height,
  width = 400,
  positionKey = `window.${title}`,
}: GameWindowProps) {
  const id = useId();
  const [tabsElement, setTabsElement] = useState<HTMLDivElement | null>(null);
  const {
    ref: dragRef,
    style: dragStyle,
    handleProps: dragHandle,
  } = useDraggable(positionKey, open);
  if (!open) {
    return null;
  }

  const content = (
    <WindowTabsContext.Provider value={tabsElement}>
      <WindowTabsStyled ref={setTabsElement} />
      <Paper
        className='game-window-surface'
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          gridColumn: 2,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <WindowTitleStyled {...dragHandle}>
          {modal ? (
            <DialogTitle id={id} sx={{ py: 0.5, fontSize: '1rem', fontWeight: 500 }}>
              {title}
            </DialogTitle>
          ) : (
            <Typography
              id={id}
              component='h2'
              sx={{ px: 1.5, py: 0.5, fontSize: '1rem', fontWeight: 500 }}
            >
              {title}
            </Typography>
          )}
          <IconButton aria-label={`Close ${title}`} onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} aria-hidden='true' />
          </IconButton>
        </WindowTitleStyled>
        <DialogContent sx={{ px: 1.5, pt: 0.5, pb: 1.5, minHeight: 0, overflowX: 'hidden' }}>
          {children}
        </DialogContent>
      </Paper>
    </WindowTabsContext.Provider>
  );

  return modal ? (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={id}
      slotProps={{
        paper: {
          component: WindowFrameStyled,
          ref: dragRef,
          style: dragStyle,
          sx: {
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
            '--window-width': `${width}px`,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'min(480px, calc(100dvh - 32px))',
            height,
            m: 2,
          },
        },
      }}
    >
      {content}
    </Dialog>
  ) : (
    <WindowFrameStyled
      component='section'
      aria-labelledby={id}
      ref={dragRef}
      style={dragStyle}
      sx={{
        '--window-width': `${width}px`,
        mx: 'auto',
        height,
      }}
    >
      {content}
    </WindowFrameStyled>
  );
}
