import { useState } from 'react';
import { Box, Button, Menu, MenuItem, Rating, Stack, Tooltip, Typography } from '@mui/material';
import { GoldBalance } from '@emberfall/ui';
import { MAX_ITEM_STARS, PERCENT, type ClientMessage, type Player } from '@emberfall/common';
import {
  anvilInRange,
  game,
  GEAR_DEFINITIONS,
  improvableItems,
  ITEM_IMPROVEMENT_PRICES,
  ITEM_STAR_BONUS,
  improvedItemStats,
} from '@emberfall/core';
import { itemIcon } from './equipment/item-icon';
import { number, SLOT_LABELS } from './equipment/metadata';
import { rolledBadges } from './equipment/badges';

// Match the action bar's square icon picker and bounded wrapping menu.
const PICKER = { tileSize: 52, maxWidth: 300 };

export function Anvil({
  player,
  send,
  disabled,
}: {
  player: Player;
  send: (message: ClientMessage) => void;
  disabled: boolean;
}) {
  const [selection, setSelection] = useState<{ id: string; slot?: string } | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const entries = improvableItems(player);
  const selected = entries.find((entry) => {
    return selection?.slot !== undefined
      ? entry.slot === selection.slot
      : entry.item.id === selection?.id && entry.slot === undefined;
  });
  const item = selected?.item;
  const gear = item ? GEAR_DEFINITIONS[item.itemId] : undefined;
  const stars = item?.stars ?? 0;
  const price = ITEM_IMPROVEMENT_PRICES[stars];
  const inRange = anvilInRange(player);
  const next = { stars: Math.min(MAX_ITEM_STARS, stars + 1) };
  const currentStats = improvedItemStats(gear?.stats ?? {}, item);
  const nextStats = improvedItemStats(gear?.stats ?? {}, next);
  const currentRolls = rolledBadges(item);
  const nextRolls = rolledBadges(item ? { ...item, ...next } : undefined);

  return (
    <Stack spacing={2}>
      <Typography>
        Choose equipment to improve. Each star adds 10% of its original stats, up to five stars.
      </Typography>
      <GoldBalance name='Anvil' coins={player.coins ?? 0} />
      <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
        <Button
          aria-label='Choose item to improve'
          aria-haspopup='menu'
          aria-expanded={!!anchor}
          onClick={(event) => {
            setAnchor(event.currentTarget);
          }}
          sx={{
            width: PICKER.tileSize,
            height: PICKER.tileSize,
            minWidth: 0,
            p: 0,
            '& img': { width: '100%', height: '100%' },
          }}
        >
          {item ? itemIcon(item.itemId) : '+'}
        </Button>
        <Box>
          <Typography>{gear?.name ?? 'Choose an item'}</Typography>
          {item && (
            <Typography variant='body2' color='text.secondary'>
              {selected?.slot ? SLOT_LABELS[selected.slot] : 'Backpack'}
            </Typography>
          )}
          <Rating
            readOnly
            value={stars}
            max={MAX_ITEM_STARS}
            aria-label={`${stars} of ${MAX_ITEM_STARS} stars`}
          />
        </Box>
      </Stack>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => {
          setAnchor(null);
        }}
        slotProps={{
          list: {
            'aria-label': 'Equipment to improve',
            sx: { display: 'flex', flexWrap: 'wrap', gap: 1, p: 1, maxWidth: PICKER.maxWidth },
          },
        }}
      >
        {entries.map((entry) => {
          const name = `${GEAR_DEFINITIONS[entry.item.itemId].name} · ${entry.slot ? SLOT_LABELS[entry.slot] : 'Backpack'} · ${entry.item.stars ?? 0}/${MAX_ITEM_STARS} stars`;

          return (
            <Tooltip key={`${entry.slot ?? 'backpack'}:${entry.item.id}`} title={name}>
              <MenuItem
                aria-label={name}
                sx={{
                  p: 0,
                  minHeight: 0,
                  width: PICKER.tileSize,
                  height: PICKER.tileSize,
                  '& img': { width: '100%', height: '100%' },
                }}
                onClick={() => {
                  setSelection({ id: entry.item.id, slot: entry.slot });
                  setAnchor(null);
                }}
              >
                {itemIcon(entry.item.itemId)}
              </MenuItem>
            </Tooltip>
          );
        })}
        {!entries.length && <MenuItem disabled>No equipment available</MenuItem>}
      </Menu>
      {item && (
        <>
          <Typography role='status'>
            {stars === MAX_ITEM_STARS
              ? 'Maximum improvement reached'
              : `${stars} → ${stars + 1} stars · +${number(next.stars * ITEM_STAR_BONUS * PERCENT)}% original stats`}
          </Typography>
          <Stack spacing={0.5} aria-label='Improvement stats'>
            {Object.entries(currentStats).map(([stat, value]) => {
              const definition = game.registries.stats.require(stat);
              const multiplier = definition.format === 'percent' ? PERCENT : 1;
              const unit = definition.format === 'percent' ? '%' : '';

              return (
                <Typography key={stat} variant='body2'>
                  {definition.label}: {number(value * multiplier)}
                  {unit} → {number(nextStats[stat] * multiplier)}
                  {unit}
                </Typography>
              );
            })}
            {currentRolls.map((badge, index) => {
              return (
                <Typography key={badge.label} variant='body2'>
                  {badge.label}: {badge.value} → {nextRolls[index].value}
                </Typography>
              );
            })}
          </Stack>
        </>
      )}
      {!inRange && <Typography color='error'>Use the smithing anvil in the village.</Typography>}
      {item && price !== undefined && (player.coins ?? 0) < price && (
        <Typography color='error'>Not enough gold.</Typography>
      )}
      <Button
        variant='contained'
        disabled={
          disabled || !inRange || !item || price === undefined || (player.coins ?? 0) < price
        }
        onClick={() => {
          if (item) {
            send({ type: 'improveItem', id: item.id, slot: selected?.slot, stars });
          }
        }}
      >
        {price === undefined ? 'Fully improved' : `Improve · ${price} gold`}
      </Button>
    </Stack>
  );
}
