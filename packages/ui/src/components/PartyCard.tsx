import { Avatar, Chip, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { StatusMeter } from "./StatusMeter";
import { PartyCardStyled } from "./styles";

export interface PartyCardProps {
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  portrait?: ReactNode;
  host?: boolean;
  local?: boolean;
  away?: boolean;
}

export function PartyCard({
  name,
  level,
  health,
  maxHealth,
  mana,
  maxMana,
  portrait,
  host,
  local,
  away,
}: PartyCardProps) {
  return (
    <PartyCardStyled
      as="article"
      aria-label={`${name}${away ? ", in another dimension" : ""}`}
      sx={{ opacity: away ? 0.4 : 1 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {portrait && typeof portrait !== "string" ? (
          portrait
        ) : (
          <Avatar src={typeof portrait === "string" ? portrait : undefined} alt="">
            {name.slice(0, 1)}
          </Avatar>
        )}
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography noWrap sx={{ fontWeight: 700 }}>
              {name}
              {local ? " (you)" : ""}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Lv. {level}
            </Typography>
            {away && <Chip size="small" label="Dimension" variant="outlined" />}
            {host && <Chip size="small" label="Host" aria-label="Host" variant="outlined" />}
          </Stack>
          <StatusMeter label={`${name} HP`} value={health} max={maxHealth} />
          {mana !== undefined && maxMana !== undefined && (
            <StatusMeter label={`${name} MP`} value={mana} max={maxMana} color="info" />
          )}
        </Stack>
      </Stack>
    </PartyCardStyled>
  );
}
