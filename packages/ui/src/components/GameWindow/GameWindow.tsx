import { useId, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Paper, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { useDraggable } from "../../useDraggable";
import { WindowTitleStyled } from "./styles";

export interface GameWindowProps {
  title: string;
  children: ReactNode;
  onClose(): void;
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
  const {
    ref: dragRef,
    style: dragStyle,
    handleProps: dragHandle,
  } = useDraggable(positionKey, open);
  if (!open) return null;
  const content = (
    <>
      <WindowTitleStyled {...dragHandle}>
        {modal ? (
          <DialogTitle id={id}>{title}</DialogTitle>
        ) : (
          <Typography id={id} component="h2" variant="h2" sx={{ p: 1.5 }}>
            {title}
          </Typography>
        )}
        <IconButton aria-label={`Close ${title}`} onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </IconButton>
      </WindowTitleStyled>
      <DialogContent sx={{ p: 1.5, minHeight: 0, overflowX: "hidden" }}>{children}</DialogContent>
    </>
  );
  return modal ? (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={id}
      slotProps={{
        paper: {
          ref: dragRef,
          style: dragStyle,
          sx: {
            width,
            maxWidth: "calc(100vw - 32px)",
            height,
            maxHeight: "min(480px, calc(100dvh - 32px))",
            m: 2,
          },
        },
      }}
    >
      {content}
    </Dialog>
  ) : (
    <Paper
      component="section"
      aria-labelledby={id}
      ref={dragRef}
      style={dragStyle}
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: width,
        mx: "auto",
        height,
        maxHeight: "min(480px, calc(100dvh - 32px))",
        overflow: "hidden",
      }}
    >
      {content}
    </Paper>
  );
}
