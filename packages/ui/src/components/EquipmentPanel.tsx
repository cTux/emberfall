import { useRef, useState, type ReactNode } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { GearTooltipStyled, EQUIPMENT_SLOT_SIZE } from './equipment.styles';
import { ItemTooltip, type ItemTooltipView, type EquipmentBadgeView } from './ItemTooltip';
import { inventoryDropProps, type InventoryDrop } from '../inventory-drag';

export type { EquipmentBadgeView } from './ItemTooltip';

export interface EquipmentStatView {
  label: string;
  value: string;
}
export interface EquipmentSlotView {
  id: string;
  label: string;
  position: { column: number; row: number };
  fallback: ReactNode;
  accepts: string;
  item?: ItemTooltipView & { badges: EquipmentBadgeView[] };
  onUnequip?(): void;
  drop?: InventoryDrop;
}
export interface EquipmentPanelProps {
  slots: EquipmentSlotView[];
  stats: EquipmentStatView[];
}

function StatRows({ stats }: { stats: EquipmentStatView[] }) {
  return (
    <Box
      component='dl'
      sx={{ m: 0, display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 2, rowGap: 0.25 }}
    >
      {stats.map(({ label, value }) => (
        <Box key={label} sx={{ display: 'contents' }}>
          <Typography component='dt' variant='body2' color='text.secondary'>
            {label}
          </Typography>
          <Typography
            component='dd'
            variant='body2'
            sx={{ m: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Presentation only: the host supplies slot layout, compatibility and calculated stats. */
export function EquipmentPanel({ slots, stats }: EquipmentPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [openSlot, setOpenSlot] = useState<string | null>(null);

  return (
    <Box
      ref={panelRef}
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 1,
        alignItems: 'start',
      }}
    >
      {slots.length > 0 && (
        <Box
          aria-label='Equipment slots'
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(3, ...slots.map((slot) => slot.position.column))}, ${EQUIPMENT_SLOT_SIZE}px)`,
            gridTemplateRows: `repeat(${Math.max(4, ...slots.map((slot) => slot.position.row))}, ${EQUIPMENT_SLOT_SIZE}px)`,
            gap: 0.5,
            justifyContent: 'center',
            width: 'max-content',
            mx: 'auto',
          }}
        >
          {slots.map((slot) => (
            <GearTooltipStyled
              key={slot.id}
              disableInteractive={!slot.item?.badges.length}
              open={openSlot === slot.id}
              onOpen={() => setOpenSlot(slot.id)}
              onClose={() => {
                setOpenSlot((current) => (current === slot.id ? null : current));
              }}
              arrow
              describeChild
              enterTouchDelay={0}
              leaveDelay={250}
              slotProps={{
                popper: {
                  container: () =>
                    panelRef.current?.closest('.MuiDialog-container') ?? document.body,
                },
              }}
              title={
                slot.item ? (
                  <ItemTooltip
                    item={slot.item}
                    action={slot.onUnequip ? 'Unequip' : undefined}
                    stats={slot.item.badges}
                    onBack={() =>
                      panelRef.current
                        ?.querySelector<HTMLButtonElement>(
                          `[data-equipment-slot="${CSS.escape(slot.id)}"]`,
                        )
                        ?.focus()
                    }
                  />
                ) : (
                  <Stack spacing={0.5}>
                    <Typography variant='subtitle2'>Empty {slot.label.toLowerCase()}</Typography>
                    <Typography variant='body2'>Accepts: {slot.accepts}</Typography>
                  </Stack>
                )
              }
            >
              <ButtonBase
                aria-label={`${slot.label}: ${slot.item?.name ?? 'Empty'}`}
                data-equipment-slot={slot.id}
                data-equipped={!!slot.item}
                data-rarity={slot.item?.rarity?.toLowerCase()}
                {...inventoryDropProps(slot.drop)}
                onClick={() => setOpenSlot(slot.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  slot.onUnequip?.();
                  setOpenSlot(null);
                }}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && slot.onUnequip) {
                    event.preventDefault();
                    slot.onUnequip();
                    setOpenSlot(null);

                    return;
                  }

                  if (event.key !== 'Tab' || event.shiftKey || openSlot !== slot.id) return;
                  const tooltipId = event.currentTarget.getAttribute('aria-describedby');
                  const badge = tooltipId
                    ? document.getElementById(tooltipId)?.querySelector<HTMLButtonElement>('button')
                    : null;
                  if (badge) {
                    event.preventDefault();
                    badge.focus();
                  }
                }}
                sx={{
                  gridColumn: slot.position.column,
                  gridRow: slot.position.row,
                  width: EQUIPMENT_SLOT_SIZE,
                  height: EQUIPMENT_SLOT_SIZE,
                  flexDirection: 'column',
                  gap: 0.5,
                  p: 0.5,
                  border: slot.item ? '1px solid' : 0,
                  borderColor: slot.item?.rarityColor ?? '#ffffff',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                  '&.Mui-focusVisible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              >
                <Box
                  aria-hidden='true'
                  sx={{
                    width: { xs: 32, sm: 44 },
                    height: { xs: 32, sm: 44 },
                    display: 'grid',
                    placeItems: 'center',
                    opacity: slot.item ? 1 : 0.25,
                    color: 'text.secondary',
                    '& img, & svg': {
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                    },
                  }}
                >
                  {slot.item?.icon ?? slot.fallback}
                </Box>
              </ButtonBase>
            </GearTooltipStyled>
          ))}
        </Box>
      )}
      {stats.length > 0 && (
        <Stack component='section' aria-label='Character stats' spacing={1} sx={{ minWidth: 0 }}>
          <StatRows stats={stats} />
        </Stack>
      )}
    </Box>
  );
}
