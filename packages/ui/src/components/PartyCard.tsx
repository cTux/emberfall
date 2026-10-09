import { Avatar, Box, Stack, Tooltip, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown } from "@fortawesome/free-solid-svg-icons/faCrown";
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons/faDoorOpen";
import { GoldBalance } from "./GoldBalance";
import type { ReactNode } from "react";
import { StatusMeter } from "./StatusMeter";
import { PartyCardStyled, PartyPortraitStyled, PartyMarkerStyled } from "./styles";

export interface PartyCardProps {
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  coins?: number;
  portrait?: ReactNode;
  host?: boolean;
  local?: boolean;
  away?: boolean;
  companion?: {
    name: string;
    health: number;
    maxHealth: number;
    portrait: ReactNode;
  };
}

export function PartyCard({
  name,
  level,
  health,
  maxHealth,
  coins,
  portrait,
  host,
  local,
  away,
  companion,
}: PartyCardProps) {
  return (
    <PartyCardStyled as="article" aria-label={`${name}${away ? ", in another dimension" : ""}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <PartyPortraitStyled>
          {portrait && typeof portrait !== "string" ? (
            portrait
          ) : (
            <Avatar src={typeof portrait === "string" ? portrait : undefined} alt="">
              {name.slice(0, 1)}
            </Avatar>
          )}
          {away && (
            <Tooltip title="In another dimension">
              <PartyMarkerStyled side="left" role="img" aria-label="In another dimension">
                <FontAwesomeIcon icon={faDoorOpen} aria-hidden="true" />
              </PartyMarkerStyled>
            </Tooltip>
          )}
          {host && (
            <Tooltip title="Host">
              <PartyMarkerStyled side="right" role="img" aria-label="Host">
                <FontAwesomeIcon icon={faCrown} aria-hidden="true" />
              </PartyMarkerStyled>
            </Tooltip>
          )}
        </PartyPortraitStyled>
        <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 0, alignItems: "center" }}>
          <Box sx={{ width: "60%", minWidth: 0 }} aria-label={local ? "Your character" : undefined}>
            <StatusMeter label={`${name}, lvl ${level}`} value={health} max={maxHealth} />
          </Box>
          {coins !== undefined && <GoldBalance name={name} coins={coins} />}
        </Stack>
      </Stack>
      {companion && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5, width: "85%" }}>
          <PartyPortraitStyled compact>{companion.portrait}</PartyPortraitStyled>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ width: "60%" }}>
              <StatusMeter
                label={companion.name}
                value={companion.health}
                max={companion.maxHealth}
                compact
              />
            </Box>
          </Box>
        </Stack>
      )}
    </PartyCardStyled>
  );
}
