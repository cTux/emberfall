import { Button, Stack, Typography } from "@mui/material";
import { PortalVoteStyled } from "./styles";

export interface PortalVoteProps {
  scene: string;
  difficulty: string;
  ready: number;
  total: number;
  voted: boolean;
  countdown?: number;
  disabled?: boolean;
  onVote(): void;
}
export function PortalVote({
  scene,
  difficulty,
  ready,
  total,
  voted,
  countdown,
  disabled,
  onVote,
}: PortalVoteProps) {
  return (
    <PortalVoteStyled as="section" aria-label="Departure vote">
      <Stack spacing={2}>
        <Typography variant="h3" component="h3" aria-live="polite">
          {scene} · {difficulty} ({ready}/{total} ready)
        </Typography>
        {countdown !== undefined && <Typography role="status">Departing in {countdown}</Typography>}
        <Button variant={voted ? "outlined" : "contained"} disabled={disabled} onClick={onVote}>
          {voted ? "Retract ready vote" : "I'm ready"}
        </Button>
      </Stack>
    </PortalVoteStyled>
  );
}
