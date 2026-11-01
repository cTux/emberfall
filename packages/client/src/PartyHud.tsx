import type { Player, WorldState, WorldSummary } from '@emberfall/common';
import { experienceRequired } from '@emberfall/core';
import { PartyCard } from '@emberfall/ui';
import { Box, Stack } from '@mui/material';
import { clientAsset } from './urls';
import { classSprite } from './class-art';

// Preserve the private-world fallback while the first world-list message is still in flight.
const FALLBACK_WORLD_CAPACITY = 8;

export function PartyHud({
  world,
  worlds,
  playerId,
  me,
  displayedHp,
}: {
  world: WorldState;
  worlds: WorldSummary[];
  playerId: string;
  me?: Player;
  displayedHp: Record<string, number>;
}) {
  return (
    <Stack
      component='aside'
      className='party'
      spacing={1}
      aria-label={`${world.name}: ${world.players.length}/${
        worlds.find((entry) => {
          return entry.id === world.id;
        })?.capacity ?? FALLBACK_WORLD_CAPACITY
      } adventurers`}
    >
      {world.players
        .filter((p) => {
          return p.id === playerId || (!!me?.partyId && p.partyId === me.partyId);
        })
        .map((p) => {
          return (
            <PartyCard
              key={p.id}
              name={p.name}
              level={p.level}
              paragon={p.paragon}
              experience={{
                current: p.experience,
                required: experienceRequired(p.level, p.paragon),
              }}
              health={displayedHp[p.id] ?? p.hitpoints}
              maxHealth={p.maxHitpoints}
              coins={p.coins ?? 0}
              companion={
                p.bear
                  ? {
                      name: p.bear.name,
                      health: p.bear.hitpoints,
                      maxHealth: p.bear.maxHitpoints,
                      portrait: (
                        <Box
                          component='span'
                          role='img'
                          aria-label={`${p.bear.name} portrait`}
                          sx={{
                            backgroundImage: `url("${clientAsset('/assets/wardrobe-style/bear-cub.png')}")`,
                            backgroundSize: '400% 200%',
                            backgroundPosition: 'left top',
                            backgroundRepeat: 'no-repeat',
                            imageRendering: 'pixelated',
                          }}
                        />
                      ),
                    }
                  : undefined
              }
              portrait={<img src={classSprite(p.classId)} alt='' />}
              local={p.id === playerId}
              host={p.id === me?.partyLeaderId}
              away={p.scene !== me?.scene || p.runId !== me?.runId}
            />
          );
        })}
    </Stack>
  );
}
