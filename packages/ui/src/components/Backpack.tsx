import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { GearTooltipStyled, BackpackSlotStyled, GearBadgeValueStyled } from './equipment.styles';
import { GoldBalance } from './GoldBalance';
import { INVENTORY_DRAG_PREFIX, inventoryDropProps, type InventoryDrop } from '../inventory-drag';

export interface BackpackItemView {
  id: string;
  name: string;
  icon: ReactNode;
  quantity: number;
  details: string;
  price: number;
}
export interface BackpackProps {
  label: string;
  items: BackpackItemView[];
  coins?: number;
  action: string;
  headerActions?: ReactNode;
  slots?: number;
  inventory?: string;
  drop?: InventoryDrop;
  onUse(id: string): void;
}
/** Twenty slots by default; keep legacy overflow accessible until it is cleared. */
export function Backpack({
  label,
  items,
  coins,
  action,
  headerActions,
  slots = 20,
  inventory,
  drop,
  onUse,
}: BackpackProps) {
  return (
    <Box component='section' aria-label={label} sx={{ minWidth: 0 }} {...inventoryDropProps(drop)}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 24,
        }}
      >
        {coins !== undefined && <GoldBalance name={label} coins={coins} />}
        {headerActions}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
          gap: 0.5,
          mt: 0.5,
        }}
      >
        {items.map((item) => (
          <GearTooltipStyled
            key={item.id}
            disableInteractive
            arrow
            describeChild
            enterTouchDelay={0}
            title={
              <Box>
                <Typography variant='subtitle2'>{item.name}</Typography>
                <Typography variant='body2'>{item.details}</Typography>
                <Typography variant='body2' color='primary.main' sx={{ mt: 1 }}>
                  {item.price} gold
                </Typography>
              </Box>
            }
          >
            <BackpackSlotStyled
              aria-label={`${action} ${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}`}
              data-backpack-item={item.id}
              draggable={!!inventory}
              onDragStart={(event) => {
                if (!inventory) return;
                event.dataTransfer.clearData();
                event.dataTransfer.setData(`${INVENTORY_DRAG_PREFIX}${inventory}`, item.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                onUse(item.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onUse(item.id);
                }
              }}
            >
              <Box aria-hidden='true' sx={{ pointerEvents: 'none' }}>
                {item.icon}
              </Box>
              {item.quantity > 1 && (
                <GearBadgeValueStyled aria-hidden='true'>{item.quantity}</GearBadgeValueStyled>
              )}
            </BackpackSlotStyled>
          </GearTooltipStyled>
        ))}
        {Array.from({ length: Math.max(0, slots - items.length) }, (_, index) => (
          <BackpackSlotStyled key={`empty-${index}`} disabled tabIndex={-1} aria-hidden='true' />
        ))}
      </Box>
    </Box>
  );
}
