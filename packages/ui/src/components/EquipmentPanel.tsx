import { useRef, useState, type ReactNode } from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { GearTooltipStyled, GearBadgeStyled, GearBadgeValueStyled } from "./equipment.styles";
import badgeAtlas from "../assets/gear-badges.png";

const BADGE_CELLS = {
  power: 0,
  range: 1,
  cooldown: 2,
  physical: 3,
  criticalChance: 4,
  criticalDamage: 5,
  bleed: 6,
  poison: 7,
  burn: 8,
  roots: 9,
  projectiles: 10,
  speed: 11,
  duration: 12,
  splash: 13,
  nature: 14,
  magic: 15,
} as const;

export interface EquipmentBadgeView {
  label: string;
  icon: keyof typeof BADGE_CELLS;
  value?: string;
  explanation: string;
}

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
  item?: {
    name: string;
    icon: ReactNode;
    badges: EquipmentBadgeView[];
    details?: string;
    price?: number;
  };
  onUnequip?(): void;
}
export interface EquipmentPanelProps {
  slots: EquipmentSlotView[];
  stats: EquipmentStatView[];
}

function StatRows({ stats }: { stats: EquipmentStatView[] }) {
  return (
    <Box
      component="dl"
      sx={{ m: 0, display: "grid", gridTemplateColumns: "1fr auto", columnGap: 2, rowGap: 0.25 }}
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  return (
    <Box
      ref={panelRef}
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 1,
        alignItems: "start",
      }}
    >
      <Box
        aria-label="Equipment slots"
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gridTemplateRows: "repeat(4, 44px)",
          gap: 0.5,
          justifyContent: "center",
          maxWidth: 160,
          width: "100%",
          mx: "auto",
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
              setOpenBadge(null);
            }}
            arrow
            describeChild
            enterTouchDelay={0}
            leaveDelay={250}
            slotProps={{
              popper: {
                container: () => panelRef.current?.closest(".MuiDialog-container") ?? document.body,
              },
            }}
            title={
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {slot.item?.name ?? `Empty ${slot.label.toLowerCase()}`}
                </Typography>
                {slot.item ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {slot.item.badges.map((badge, index) => {
                      const cell = BADGE_CELLS[badge.icon];
                      return (
                        <GearTooltipStyled
                          key={badge.label}
                          open={openSlot === slot.id && openBadge === badge.label}
                          onOpen={() => setOpenBadge(badge.label)}
                          onClose={() =>
                            setOpenBadge((current) => (current === badge.label ? null : current))
                          }
                          arrow
                          describeChild
                          title={
                            <>
                              <Typography variant="subtitle2">{badge.label}</Typography>
                              <Typography variant="body2">{badge.explanation}</Typography>
                            </>
                          }
                          enterTouchDelay={0}
                          placement="bottom"
                          slotProps={{
                            popper: {
                              container: () =>
                                panelRef.current?.closest(".MuiDialog-container") ?? document.body,
                            },
                          }}
                        >
                          <GearBadgeStyled
                            aria-label={`${badge.label}${badge.value ? `: ${badge.value}` : ""}`}
                            data-equipment-badge={badge.icon}
                            onClick={() => setOpenBadge(badge.label)}
                            onKeyDown={(event) => {
                              if (index !== 0 || event.key !== "Tab" || !event.shiftKey) return;
                              const slotButton = panelRef.current?.querySelector<HTMLButtonElement>(
                                `[data-equipment-slot="${CSS.escape(slot.id)}"]`,
                              );
                              if (slotButton) {
                                event.preventDefault();
                                slotButton.focus();
                              }
                            }}
                          >
                            <Box
                              aria-hidden="true"
                              sx={{
                                width: 40,
                                height: 40,
                                backgroundImage: `url(${badgeAtlas})`,
                                backgroundSize: "400% 400%",
                                backgroundPosition: `${((cell % 4) * 100) / 3}% ${(Math.floor(cell / 4) * 100) / 3}%`,
                                imageRendering: "pixelated",
                              }}
                            />
                            {badge.value && (
                              <GearBadgeValueStyled aria-hidden="true">
                                {badge.value}
                              </GearBadgeValueStyled>
                            )}
                          </GearBadgeStyled>
                        </GearTooltipStyled>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2">Accepts: {slot.accepts}</Typography>
                )}
                {slot.item?.details && <Typography variant="body2">{slot.item.details}</Typography>}
                {slot.item && (
                  <Typography variant="body2" color="primary.main">
                    {slot.item.price ?? 1} gold
                  </Typography>
                )}
              </Stack>
            }
          >
            <ButtonBase
              aria-label={`${slot.label}: ${slot.item?.name ?? "Empty"}`}
              data-equipment-slot={slot.id}
              data-equipped={!!slot.item}
              onClick={() => setOpenSlot(slot.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                slot.onUnequip?.();
                setOpenSlot(null);
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && slot.onUnequip) {
                  event.preventDefault();
                  slot.onUnequip();
                  setOpenSlot(null);
                  return;
                }
                if (event.key !== "Tab" || event.shiftKey || openSlot !== slot.id) return;
                const tooltipId = event.currentTarget.getAttribute("aria-describedby");
                const badge = tooltipId
                  ? document.getElementById(tooltipId)?.querySelector<HTMLButtonElement>("button")
                  : null;
                if (badge) {
                  event.preventDefault();
                  badge.focus();
                }
              }}
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
                  width: { xs: 32, sm: 44 },
                  height: { xs: 32, sm: 44 },
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
            </ButtonBase>
          </GearTooltipStyled>
        ))}
      </Box>
      <Stack component="section" aria-label="Character stats" spacing={1} sx={{ minWidth: 0 }}>
        <StatRows stats={stats} />
      </Stack>
    </Box>
  );
}
