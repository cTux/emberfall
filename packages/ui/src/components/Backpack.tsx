import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { GearTooltipStyled, BackpackSlotStyled, GearBadgeValueStyled } from "./equipment.styles";
import { GoldBalance } from "./GoldBalance";

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
  onUse(id: string): void;
}
/** Slots grow with the supplied inventory; empty cells are presentation only. */
export function Backpack({ label, items, coins, action, onUse }: BackpackProps) {
  return (
    <Box component="section" aria-label={label} sx={{ minWidth: 0 }}>
      {coins !== undefined && <GoldBalance name={label} coins={coins} />}
      <Box
        sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 44px)", gap: 0.5, mt: 0.5 }}
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
                <Typography variant="subtitle2">{item.name}</Typography>
                <Typography variant="body2">{item.details}</Typography>
                <Typography variant="body2" color="primary.main" sx={{ mt: 1 }}>
                  {item.price} gold
                </Typography>
              </Box>
            }
          >
            <BackpackSlotStyled
              aria-label={`${action} ${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ""}`}
              data-backpack-item={item.id}
              onContextMenu={(event) => {
                event.preventDefault();
                onUse(item.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onUse(item.id);
                }
              }}
            >
              <Box aria-hidden="true">{item.icon}</Box>
              {item.quantity > 1 && (
                <GearBadgeValueStyled aria-hidden="true">{item.quantity}</GearBadgeValueStyled>
              )}
            </BackpackSlotStyled>
          </GearTooltipStyled>
        ))}
        {Array.from({ length: Math.max(0, 16 - items.length) }, (_, index) => (
          <BackpackSlotStyled key={`empty-${index}`} disabled tabIndex={-1} aria-hidden="true" />
        ))}
      </Box>
    </Box>
  );
}
