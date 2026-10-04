import type { ReactNode } from "react";
import { Box, ButtonBase, Stack, Tooltip, Typography } from "@mui/material";

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
  item?: { name: string; icon: ReactNode; description: string; stats: EquipmentStatView[] };
}
export interface EquipmentPanelProps {
  slots: EquipmentSlotView[];
  stats: EquipmentStatView[];
}

function StatRows({ stats }: { stats: EquipmentStatView[] }) {
  return (
    <Box
      component="dl"
      sx={{ m: 0, display: "grid", gridTemplateColumns: "1fr auto", columnGap: 2, rowGap: 0.5 }}
    >
      {stats.map(({ label, value }) => (
        <Box key={label} sx={{ display: "contents" }}>
          <Typography component="dt" variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography
            component="dd"
            variant="body2"
            sx={{ m: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
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
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "240px minmax(0, 1fr)" },
        gap: 3,
        alignItems: "start",
      }}
    >
      <Box
        aria-label="Equipment slots"
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 72px)",
          gridTemplateRows: "repeat(4, 78px)",
          gap: 1,
          justifyContent: "center",
        }}
      >
        {slots.map((slot) => (
          <Tooltip
            key={slot.id}
            arrow
            describeChild
            enterTouchDelay={0}
            title={
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {slot.item?.name ?? `Empty ${slot.label.toLowerCase()}`}
                </Typography>
                <Typography variant="body2">
                  {slot.item?.description ?? `Accepts: ${slot.accepts}`}
                </Typography>
                {slot.item && <StatRows stats={slot.item.stats} />}
              </Stack>
            }
          >
            <ButtonBase
              aria-label={`${slot.label}: ${slot.item?.name ?? "Empty"}`}
              data-equipment-slot={slot.id}
              data-equipped={!!slot.item}
              sx={{
                gridColumn: slot.position.column,
                gridRow: slot.position.row,
                flexDirection: "column",
                gap: 0.5,
                p: 0.5,
                border: 0,
                borderRadius: 1,
                "&:hover": { bgcolor: "action.hover" },
                "&.Mui-focusVisible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  opacity: slot.item ? 1 : 0.25,
                  color: "text.secondary",
                  "& img, & svg": {
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    imageRendering: "pixelated",
                  },
                }}
              >
                {slot.item?.icon ?? slot.fallback}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {slot.label}
              </Typography>
            </ButtonBase>
          </Tooltip>
        ))}
      </Box>
      <Stack component="section" aria-label="Character stats" spacing={1} sx={{ minWidth: 0 }}>
        <Typography component="h3" variant="subtitle2">
          Character stats
        </Typography>
        <StatRows stats={stats} />
      </Stack>
    </Box>
  );
}
