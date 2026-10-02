import type { ReactNode } from "react";
import { ButtonBase, Chip, Paper, Stack, Typography } from "@mui/material";

export interface ChoiceCardProps {
  title: string;
  description: string;
  details?: ReactNode;
  icon?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onSelect(): void;
}
export function ChoiceCard({
  title,
  description,
  details,
  icon,
  selected,
  disabled,
  onSelect,
}: ChoiceCardProps) {
  return (
    <Paper sx={{ borderColor: selected ? "primary.main" : "divider" }}>
      <ButtonBase
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={!!selected}
        sx={{ width: "100%", p: 2, textAlign: "left", justifyContent: "flex-start" }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          {icon}
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
              {selected && <Chip label="Selected" size="small" color="primary" />}
            </Stack>
            <Typography color="text.secondary">{description}</Typography>
            {details}
          </Stack>
        </Stack>
      </ButtonBase>
    </Paper>
  );
}
