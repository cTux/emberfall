import { Typography } from "@mui/material";
import { StatusMeterStyled, StatusMeterProgressStyled, StatusMeterTextStyled } from "./styles";

export interface StatusMeterProps {
  label: string;
  value: number;
  max: number;
  color?: "success" | "info" | "warning" | "error" | "boss";
  centered?: boolean;
}

export function StatusMeter({
  label,
  value,
  max,
  color = "success",
  centered = false,
}: StatusMeterProps) {
  const limit = Number.isFinite(max) && max > 0 ? max : 0;
  const current = Number.isFinite(value) ? Math.min(limit, Math.max(0, value)) : 0;
  return (
    <StatusMeterStyled>
      <StatusMeterProgressStyled
        variant="determinate"
        value={limit ? (current / limit) * 100 : 0}
        color={color}
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={limit || 1}
        aria-valuetext={`${Math.round(current)} / ${Math.round(limit)}`}
      />
      <StatusMeterTextStyled centered={centered} aria-hidden="true">
        <Typography variant="caption" noWrap>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ flexShrink: 0 }}>
          {Math.round(current)} / {Math.round(limit)}
        </Typography>
      </StatusMeterTextStyled>
    </StatusMeterStyled>
  );
}
