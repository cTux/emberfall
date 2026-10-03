import type { ReactNode } from "react";
import { Box, Button, ButtonBase, Paper, Stack, Tooltip, Typography } from "@mui/material";

export interface ClassCardItem {
  name: string;
  icon: ReactNode;
  description: string;
}
export interface ClassCardProps {
  title: string;
  portrait: ReactNode;
  weapon: ClassCardItem;
  spell: ClassCardItem;
  stats: { level: number; experience: number; maxHitpoints: number; maxManapoints: number };
  selected: boolean;
  disabled?: boolean;
  onSelect(): void;
}

export function ClassCard({
  title,
  portrait,
  weapon,
  spell,
  stats,
  selected,
  disabled,
  onSelect,
}: ClassCardProps) {
  return (
    <Paper
      component="article"
      aria-label={title}
      sx={{
        minWidth: 0,
        p: { xs: 0.5, sm: 1 },
        bgcolor: "background.default",
        borderColor: selected ? "primary.main" : "divider",
      }}
    >
      <Stack spacing={1} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: { xs: 38, sm: 57 },
            height: { xs: 38, sm: 57 },
            "& img": {
              width: "100%",
              height: "100%",
              imageRendering: "pixelated",
              objectFit: "contain",
            },
          }}
        >
          {portrait}
        </Box>
        <Typography component="h3" sx={{ fontSize: { xs: 14, sm: 16 }, fontWeight: 700 }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 0.5,
            width: "100%",
            maxWidth: 94,
          }}
        >
          {(
            [
              ["Weapon", weapon],
              ["Spell", spell],
            ] as const
          ).map(([label, item]) => (
            <Box key={label} sx={{ minWidth: 0, textAlign: "center" }}>
              <Tooltip
                arrow
                describeChild
                enterTouchDelay={0}
                title={
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                    <Typography variant="caption">{item.description}</Typography>
                  </Stack>
                }
              >
                <ButtonBase
                  aria-label={`${label === "Weapon" ? "Starting weapon" : "Base spell"} for ${title}: ${item.name}`}
                  sx={{
                    width: "100%",
                    aspectRatio: "1",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    bgcolor: "background.paper",
                    "&:hover": { borderColor: "primary.main" },
                    "& img": {
                      width: { xs: 22, sm: 28 },
                      height: { xs: 22, sm: 28 },
                      objectFit: "contain",
                      imageRendering: "pixelated",
                    },
                  }}
                >
                  {item.icon}
                </ButtonBase>
              </Tooltip>
              <Typography
                component="span"
                sx={{ display: "block", fontSize: 11, color: "text.secondary", mt: 0.25 }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box
          component="dl"
          sx={{
            width: "100%",
            m: 0,
            pt: 1,
            borderTop: 1,
            borderColor: "divider",
            fontSize: { xs: 12, sm: 13 },
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {(
            [
              ["Level", stats.level],
              ["XP", stats.experience],
              ["HP", stats.maxHitpoints],
              ["MP", stats.maxManapoints],
            ] as const
          ).map(([label, value]) => (
            <Box key={label} sx={{ display: "flex", justifyContent: "space-between", gap: 0.5 }}>
              <Box component="dt" sx={{ color: "text.secondary" }}>
                {label}
              </Box>
              <Box component="dd" sx={{ m: 0 }}>
                {Math.round(value)}
              </Box>
            </Box>
          ))}
        </Box>
        <Button
          fullWidth
          size="small"
          variant={selected ? "contained" : "outlined"}
          disabled={disabled || selected}
          aria-label={`${title} ${selected ? "selected" : "select"}`}
          aria-pressed={selected}
          onClick={onSelect}
          sx={{
            minWidth: 0,
            px: 0.25,
            fontSize: { xs: 12, sm: 13 },
            ...(selected && {
              "&.Mui-disabled": { bgcolor: "primary.main", color: "primary.contrastText" },
            }),
          }}
        >
          {selected ? "Selected" : "Select"}
        </Button>
      </Stack>
    </Paper>
  );
}
