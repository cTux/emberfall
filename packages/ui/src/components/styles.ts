import {
  Box,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  alpha,
  linearProgressClasses,
  styled,
} from '@mui/material';

// Preserve existing HUD spacing/type and compact party meters; these are visual calibration values.
const HUD_STYLE = {
  buttonWidth: 5,
  buttonHeight: 6.5,
  smallGap: 0.5,
  shortcutWidth: 2.25,
  shortcutFontPx: 11,
  shortcutLineHeight: 2,
  compactPortrait: 2.5,
  portrait: 3,
  markerFontPx: 9,
  markerPadding: 0.125,
  panelPadding: 2,
  panelOpacity: 0.15,
  thinMeter: 1.75,
};

export const HudActionButtonStyled = styled(IconButton)(({ theme }) => {
  return {
    width: theme.spacing(HUD_STYLE.buttonWidth),
    height: theme.spacing(HUD_STYLE.buttonHeight),
    padding: theme.spacing(HUD_STYLE.smallGap),
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: theme.spacing(HUD_STYLE.smallGap),
  };
});

export const HudShortcutStyled = styled('kbd')(({ theme }) => {
  return {
    minWidth: theme.spacing(HUD_STYLE.shortcutWidth),
    padding: theme.spacing(0, HUD_STYLE.smallGap),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
    fontFamily: 'inherit',
    fontSize: theme.typography.pxToRem(HUD_STYLE.shortcutFontPx),
    fontWeight: 700,
    lineHeight: theme.spacing(HUD_STYLE.shortcutLineHeight),
    pointerEvents: 'none',
  };
});

export const PartyCardStyled = styled(Paper)(({ theme }) => {
  return {
    padding: theme.spacing(1),
    backgroundColor: 'transparent',
    border: 0,
    boxShadow: 'none',
  };
});

export const PartyPortraitStyled = styled(Box, {
  shouldForwardProp: (prop) => {
    return prop !== 'compact';
  },
})<{ compact?: boolean }>(({ theme, compact }) => {
  return {
    position: 'relative',
    width: theme.spacing(compact ? HUD_STYLE.compactPortrait : HUD_STYLE.portrait),
    height: theme.spacing(compact ? HUD_STYLE.compactPortrait : HUD_STYLE.portrait),
    flexShrink: 0,
    '& > :first-child': { width: '100%', height: '100%', display: 'block' },
  };
});

export const PartyMarkerStyled = styled(Box, {
  shouldForwardProp: (prop) => {
    return prop !== 'side';
  },
})<{ side: 'left' | 'right' }>(({ theme, side }) => {
  return {
    position: 'absolute',
    top: 0,
    [side]: 0,
    display: 'flex',
    fontSize: theme.typography.pxToRem(HUD_STYLE.markerFontPx),
    padding: theme.spacing(HUD_STYLE.markerPadding),
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.background.default,
  };
});

export const BossHealthStyled = styled(Paper)(({ theme }) => {
  return {
    padding: theme.spacing(HUD_STYLE.panelPadding),
    textAlign: 'center',
    backgroundColor: alpha(theme.palette.background.paper, HUD_STYLE.panelOpacity),
    borderColor: alpha(theme.palette.divider, HUD_STYLE.panelOpacity),
  };
});

export const PortalVoteStyled = styled(Paper)(({ theme }) => {
  return {
    padding: theme.spacing(HUD_STYLE.panelPadding),
    backgroundColor: alpha(theme.palette.background.paper, HUD_STYLE.panelOpacity),
    borderColor: alpha(theme.palette.divider, HUD_STYLE.panelOpacity),
  };
});

export const StatusMeterStyled = styled(Box)({ position: 'relative' });

export const StatusMeterProgressStyled = styled(LinearProgress, {
  shouldForwardProp: (prop) => {
    return prop !== 'compact' && prop !== 'thin';
  },
})<{ compact?: boolean; thin?: boolean }>(({ theme, color = 'primary', compact, thin }) => {
  return {
    height: theme.spacing(
      thin ? HUD_STYLE.thinMeter : compact ? HUD_STYLE.compactPortrait : HUD_STYLE.portrait,
    ),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    // Solid muted fills keep parchment text readable without showing the scene through.
    [`& .${linearProgressClasses.bar}`]: {
      backgroundColor: `color-mix(in srgb, ${color === 'inherit' ? 'currentColor' : theme.palette[color].main} 40%, ${theme.palette.background.paper})`,
    },
  };
});

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
