import { useState, useRef, type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { GearTooltipStyled } from './equipment.styles';
import { ItemStatStyled, ItemTooltipContentStyled } from './item-tooltip.styles';

export interface EquipmentBadgeView {
  label: string;
  icon:
    | 'power'
    | 'range'
    | 'cooldown'
    | 'physical'
    | 'criticalChance'
    | 'criticalDamage'
    | 'bleed'
    | 'poison'
    | 'burn'
    | 'roots'
    | 'projectiles'
    | 'speed'
    | 'duration'
    | 'splash'
    | 'nature'
    | 'magic';
  value?: string;
  explanation: string;
}

export interface ItemTooltipView {
  name: string;
  icon: ReactNode;
  subtitle?: string;
  primary?: { label: string; value: string };
  details?: string;
  price?: number;
}

/** Shared item layout; the host owns item rules and contextual actions. */
export function ItemTooltip({
  item,
  quantity,
  action,
  stats = [],
  onBack,
}: {
  item: ItemTooltipView;
  quantity?: number;
  action?: string;
  stats?: EquipmentBadgeView[];
  onBack?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [openStat, setOpenStat] = useState<string | null>(null);
  return (
    <ItemTooltipContentStyled ref={root}>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }} className='item-header'>
        <Box aria-hidden='true' className='item-icon'>
          {item.icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
            {item.name}
          </Typography>
          {item.subtitle && (
            <Typography variant='body2' color='text.secondary'>
              {item.subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      {item.primary && (
        <Stack direction='row' sx={{ alignItems: 'baseline' }} spacing={0.5}>
          <Typography component='span' className='item-power'>
            {item.primary.value}
          </Typography>
          <Typography component='span' variant='subtitle2'>
            {item.primary.label}
          </Typography>
        </Stack>
      )}
      {item.details && <Typography variant='body2'>{item.details}</Typography>}
      {stats.map((stat, index) => (
        <GearTooltipStyled
          key={stat.label}
          open={openStat === stat.label}
          onOpen={() => setOpenStat(stat.label)}
          onClose={() => setOpenStat(null)}
          describeChild
          placement='bottom'
          slotProps={{
            popper: {
              container: () => root.current?.closest('.MuiDialog-container') ?? document.body,
            },
          }}
          title={<Typography variant='body2'>{stat.explanation}</Typography>}
        >
          <ItemStatStyled
            aria-label={`${stat.label}${stat.value ? `: ${stat.value}` : ''}`}
            data-equipment-badge={stat.icon}
            onClick={() => setOpenStat(stat.label)}
            onKeyDown={(event) => {
              if (index === 0 && event.key === 'Tab' && event.shiftKey && onBack) {
                event.preventDefault();
                onBack();
              }
            }}
          >
            {stat.value ? (
              <>
                <Box component='span' sx={{ color: 'text.secondary' }}>
                  {stat.label}
                </Box>
                <span>{stat.value}</span>
              </>
            ) : (
              <Box sx={{ width: '100%', py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant='body2' color='primary.main' sx={{ fontWeight: 700 }}>
                  {stat.label}
                </Typography>
                <Typography variant='body2'>{stat.explanation}</Typography>
              </Box>
            )}
          </ItemStatStyled>
        </GearTooltipStyled>
      ))}
      {quantity !== undefined && (
        <Stack direction='row' sx={{ justifyContent: 'space-between' }}>
          <Typography variant='body2' color='text.secondary'>
            Quantity
          </Typography>
          <Typography variant='body2'>{quantity}</Typography>
        </Stack>
      )}
      <Stack
        direction='row'
        sx={{ justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}
        className='item-footer'
      >
        <Typography variant='body2' color='primary.main'>
          {item.price ?? 1} gold{quantity !== undefined ? ' each' : ''}
        </Typography>
        {action && (
          <Typography variant='caption' color='text.secondary'>
            Right-click: {action.toLowerCase()}
          </Typography>
        )}
      </Stack>
    </ItemTooltipContentStyled>
  );
}
