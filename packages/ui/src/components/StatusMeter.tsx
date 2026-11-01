import { Typography } from '@mui/material';
import { StatusMeterStyled, StatusMeterProgressStyled, StatusMeterTextStyled } from './styles';

// Thin XP meters retain hundredth precision so small progress remains visible.
const THIN_METER_FRACTION_DIGITS = 2;
// MUI determinate progress consumes percentages rather than a normalized fraction.
const FULL_PERCENT = 100;

export interface StatusMeterProps {
  label: string;
  value: number;
  max: number;
  color?: 'success' | 'info' | 'warning' | 'error' | 'boss';
  centered?: boolean;
  compact?: boolean;
  thin?: boolean;
}

export function StatusMeter({
  label,
  value,
  max,
  color = 'success',
  centered = false,
  compact = false,
  thin = false,
}: StatusMeterProps) {
  const limit = Number.isFinite(max) && max > 0 ? max : 0;
  const current = Number.isFinite(value) ? Math.min(limit, Math.max(0, value)) : 0;
  const text = `${thin ? Number(current.toFixed(THIN_METER_FRACTION_DIGITS)) : Math.round(current)} / ${Math.round(limit)}`;

  return (
    <StatusMeterStyled>
      <StatusMeterProgressStyled
        variant='determinate'
        value={limit ? (current / limit) * FULL_PERCENT : 0}
        color={color}
        compact={compact}
        thin={thin}
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={limit || 1}
        aria-valuetext={text}
      />
      <StatusMeterTextStyled
        centered={centered}
        aria-hidden='true'
        sx={thin ? { '& .MuiTypography-root': { fontSize: 10 } } : undefined}
      >
        {!thin && (
          <Typography variant='caption' noWrap>
            {label}
          </Typography>
        )}
        <Typography variant='caption' sx={{ flexShrink: 0 }}>
          {text}
        </Typography>
      </StatusMeterTextStyled>
    </StatusMeterStyled>
  );
}
