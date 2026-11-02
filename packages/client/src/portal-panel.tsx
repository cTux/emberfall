import type { Actions } from './actions.tsx';
import {
  type WorldState,
  type SceneState,
  type Player,
  Difficulty,
  type DimensionId,
  DIMENSION_IDS,
} from '@emberfall/common';
import { useState } from 'react';
import { dimensionDefinition, difficultyMultiplier } from '@emberfall/core';
import { Typography, Button, Stack, TextField, MenuItem } from '@mui/material';
import { PortalVote } from '@emberfall/ui';

export function PortalPanel({
  world,
  scene,
  playerId,
  me,
  departure,
  unavailable,
  send,
  canRegenerate,
  difficulty,
  setDifficulty,
  onClose,
}: Actions & {
  world: WorldState | null;
  scene?: SceneState;
  playerId: string;
  me?: Player;
  departure?: number;
  canRegenerate: boolean;
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
}) {
  const [dimension, setDimension] = useState<DimensionId>('forest');
  const selected = dimensionDefinition(dimension);

  return (
    <>
      {world && scene && ['voting', 'countdown'].includes(scene.phase) ? (
        <>
          <Typography>Scene created. Vote here when you are ready.</Typography>
          <PortalVote
            scene={dimensionDefinition(scene.dimension).name}
            difficulty={scene.difficulty}
            ready={scene.ready.length}
            total={
              world.players.filter((p) => {
                return p.id === playerId || (!!me?.partyId && p.partyId === me.partyId);
              }).length
            }
            voted={scene.ready.includes(playerId)}
            countdown={scene.phase === 'countdown' ? departure : undefined}
            disabled={unavailable}
            onVote={() => {
              const ready = !scene.ready.includes(playerId);
              send({ type: 'ready', ready });

              if (ready) {
                onClose();
              }
            }}
          />
        </>
      ) : scene?.phase === 'active' && !me?.scene && !scene.portals.length ? (
        <>
          <Typography>
            Your party has a scene in progress. Join before the boss is defeated.
          </Typography>
          <Button
            variant='contained'
            disabled={unavailable}
            onClick={() => {
              return send({ type: 'joinScene' });
            }}
          >
            Join scene
          </Button>
          {canRegenerate && (!me?.partyId || me.partyLeaderId === playerId) && (
            <>
              <Typography>No living players remain inside. The scene is paused.</Typography>
              <Button
                disabled={unavailable}
                onClick={() => {
                  return send({
                    type: 'createScene',
                    scene: 'Forest',
                    difficulty: scene.difficulty,
                    dimension: scene.dimension,
                  });
                }}
              >
                Regenerate scene
              </Button>
            </>
          )}
        </>
      ) : scene && !canRegenerate ? (
        <Typography>
          {['active', 'ended'].includes(scene.phase)
            ? scene.phase === 'ended'
              ? 'Scene complete. Everyone must return before creating a new one.'
              : 'You are already in this scene.'
            : 'Scene created. Vote here when you are ready.'}
        </Typography>
      ) : me?.partyId && me.partyLeaderId !== playerId ? (
        <Typography>The party leader creates the dimension.</Typography>
      ) : (
        <Stack
          component='form'
          spacing={2}
          onSubmit={(e) => {
            e.preventDefault();
            send({ type: 'createScene', scene: 'Forest', difficulty, dimension });
          }}
        >
          <TextField
            select
            label='Dimension'
            value={dimension}
            onChange={(event) => {
              return setDimension(event.target.value as DimensionId);
            }}
            helperText={`${selected.enemyMultiplier}× enemy stats · ${selected.rarityMultiplier}× loot rarity`}
          >
            {DIMENSION_IDS.map((id) => {
              return (
                <MenuItem key={id} value={id}>
                  {dimensionDefinition(id).name}
                </MenuItem>
              );
            })}
          </TextField>
          <TextField
            select
            label='Difficulty'
            value={difficulty}
            onChange={(event) => {
              return setDifficulty(event.target.value as Difficulty);
            }}
            helperText={`${difficultyMultiplier(difficulty)}× enemy health and damage`}
          >
            {Object.values(Difficulty).map((value) => {
              return (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              );
            })}
          </TextField>
          <Stack direction='row' spacing={1}>
            <Button type='submit' variant='contained' disabled={unavailable}>
              {canRegenerate ? 'Regenerate scene' : 'Create'}
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Stack>
        </Stack>
      )}
    </>
  );
}
