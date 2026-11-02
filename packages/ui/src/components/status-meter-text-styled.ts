import { styled, Stack } from '@mui/material';

// Preserve existing HUD spacing/type and compact party meters; these are visual calibration values.

export const StatusMeterTextStyled = styled(Stack, {
  shouldForwardProp: (prop) => {
    return prop !== 'centered';
  },
})<{ centered: boolean }>(({ theme, centered }) => {
  return {
    position: 'absolute',
    inset: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: centered ? 'center' : 'space-between',
    gap: theme.spacing(1),
    paddingInline: theme.spacing(1),
    color: theme.palette.text.primary,
    pointerEvents: 'none',
  };
});
