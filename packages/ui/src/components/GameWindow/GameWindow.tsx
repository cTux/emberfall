import { useId, useRef, useState, type ReactNode, type PointerEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { WindowTitleStyled } from "./styles";

export interface GameWindowProps {
  title: string;
  children: ReactNode;
  onClose(): void;
  open?: boolean;
  modal?: boolean;
}

/** Focus trapping and Escape come from MUI; drag offsets remain local presentation state. */
export function GameWindow({
  title,
  children,
  onClose,
  open = true,
  modal = true,
}: GameWindowProps) {
  const id = useId();
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    const dx = Math.max(
      -box.left,
      Math.min(window.innerWidth - box.right, event.clientX - drag.current.x),
    );
    const dy = Math.max(
      -box.top,
      Math.min(window.innerHeight - box.bottom, event.clientY - drag.current.y),
    );
    setOffset((previous) => ({ x: previous.x + dx, y: previous.y + dy }));
    drag.current = { x: event.clientX, y: event.clientY };
  };
  if (!open) return null;
  const content = (
    <>
      <WindowTitleStyled
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if ((event.target as HTMLElement).closest("button")) return;
          drag.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {modal ? (
          <DialogTitle id={id}>{title}</DialogTitle>
        ) : (
          <Typography id={id} variant="h2" sx={{ p: 2 }}>
            {title}
          </Typography>
        )}
        <IconButton aria-label={`Close ${title}`} onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </IconButton>
      </WindowTitleStyled>
      {modal ? <DialogContent>{children}</DialogContent> : <Stack sx={{ p: 2 }}>{children}</Stack>}
    </>
  );
  return modal ? (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={id}
      slotProps={{ paper: { style: { transform: `translate(${offset.x}px, ${offset.y}px)` } } }}
    >
      {content}
    </Dialog>
  ) : (
    <Paper
      component="section"
      aria-labelledby={id}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      {content}
    </Paper>
  );
}
