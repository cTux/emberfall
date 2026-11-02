export const autoCastStyle = {
  '& [data-auto-cast-border]': { color: 'inherit' },
  '& [data-auto-cast-border] rect': { animation: 'auto-cast-dashes 1s linear infinite' },
  '@keyframes auto-cast-dashes': { to: { strokeDashoffset: -20 } },
  '@media (prefers-reduced-motion: reduce)': {
    '& [data-auto-cast-border] rect': { animation: 'none' },
  },
};
