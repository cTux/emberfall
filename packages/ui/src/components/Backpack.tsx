import { useRef, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { GearTooltipStyled, BackpackSlotStyled, GearBadgeValueStyled } from './equipment.styles';
import { ItemTooltip, type ItemTooltipView, type EquipmentBadgeView } from './ItemTooltip';
import { GoldBalance } from './GoldBalance';
import { INVENTORY_DRAG_PREFIX, inventoryDropProps, type InventoryDrop } from '../inventory-drag';

export interface BackpackItemView extends ItemTooltipView {
  stats?: EquipmentBadgeView[];
  useAction?: string;
  id: string;
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
  onUse: (id: string, modifiers: { shiftKey: boolean; ctrlKey: boolean }) => void;
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
  const panelRef = useRef<HTMLDivElement>(null);
  return (
    <Box
      ref={panelRef}
      component='section'
      aria-label={label}
      sx={{ minWidth: 0 }}
      {...inventoryDropProps(drop)}
    >
      {(coins !== undefined || headerActions) && (
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
      )}
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
            disableInteractive={!item.stats?.length}
            arrow
            describeChild
            enterTouchDelay={0}
            slotProps={{
              popper: {
                container: () => panelRef.current?.closest('.MuiDialog-container') ?? document.body,
              },
            }}
            title={
              <ItemTooltip
                item={item}
                quantity={item.quantity}
                stats={item.stats}
                onBack={() =>
                  panelRef.current
                    ?.querySelector<HTMLButtonElement>(
                      `[data-backpack-item="${CSS.escape(item.id)}"]`,
                    )
                    ?.focus()
                }
                action={action === 'Use' ? item.useAction : action}
              />
            }
          >
            <BackpackSlotStyled
              aria-label={`${action} ${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}`}
              data-backpack-item={item.id}
              data-rarity={item.rarity?.toLowerCase()}
              sx={{
                border: '1px solid',
                borderColor: item.rarityColor ?? 'divider',
                '&:hover': { borderColor: item.rarityColor ?? 'primary.main' },
              }}
              draggable={!!inventory}
              onDragStart={(event) => {
                if (!inventory) return;
                event.dataTransfer.clearData();
                event.dataTransfer.setData(`${INVENTORY_DRAG_PREFIX}${inventory}`, item.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                onUse(item.id, event);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onUse(item.id, event);
                  return;
                }
                if (event.key !== 'Tab' || event.shiftKey) return;
                const tooltipId = event.currentTarget.getAttribute('aria-describedby');
                const stat = tooltipId
                  ? document.getElementById(tooltipId)?.querySelector<HTMLButtonElement>('button')
                  : null;
                if (stat) {
                  event.preventDefault();
                  stat.focus();
                }
              }}
            >
              <Box
                aria-hidden='true'
                sx={{ display: 'grid', placeItems: 'center', pointerEvents: 'none' }}
              >
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
