import {
  Difficulty,
  type ClientMessage,
  type Player,
  type SceneState,
  type WorldState,
} from '@emberfall/common';
import { difficultyMultiplier } from '@emberfall/core';
import { PortalVote } from '@emberfall/ui';
import { Typography, Stack, Button, TextField, MenuItem } from '@mui/material';
type Actions = {
  unavailable: boolean;
  send: (message: ClientMessage) => void;
  onClose: () => void;
};

export function LeavePanel({
  me,
  unavailable,
  send,
  act,
  onClose,
}: Actions & { me?: Player; act: (message: ClientMessage) => void }) {
  return (
    <>
      <Typography>
        {me?.scene === 'forest'
          ? 'Are you sure you want to leave the current game? Your party will continue.'
          : 'Are you sure you want to leave the lobby?'}
      </Typography>
      <Stack direction='row' spacing={1}>
        <Button variant='outlined' onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant='contained'
          color='error'
          disabled={unavailable}
          onClick={() => {
            if (me?.scene === 'forest') send({ type: 'leaveScene' });
            else act({ type: 'leave' });
            onClose();
          }}
        >
          Leave
        </Button>
      </Stack>
    </>
  );
}

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
  return (
    <>
      {world && scene && ['voting', 'countdown'].includes(scene.phase) ? (
        <>
          <Typography>Scene created. Vote here when you are ready.</Typography>
          <PortalVote
            scene={scene.type}
            difficulty={scene.difficulty}
            ready={scene.ready.length}
            total={
              world.players.filter(
                (p) => p.id === playerId || (!!me?.partyId && p.partyId === me.partyId),
              ).length
            }
            voted={scene.ready.includes(playerId)}
            countdown={scene.phase === 'countdown' ? departure : undefined}
            disabled={unavailable}
            onVote={() => {
              const ready = !scene.ready.includes(playerId);
              send({ type: 'ready', ready });
              if (ready) onClose();
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
            onClick={() => send({ type: 'joinScene' })}
          >
            Join scene
          </Button>
          {canRegenerate && (!me?.partyId || me.partyLeaderId === playerId) && (
            <>
              <Typography>No living players remain inside. The scene is paused.</Typography>
              <Button
                disabled={unavailable}
                onClick={() =>
                  send({
                    type: 'createScene',
                    scene: 'Forest',
                    difficulty: scene.difficulty,
                  })
                }
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
            send({ type: 'createScene', scene: 'Forest', difficulty });
          }}
        >
          <TextField select label='Scene type' defaultValue='Forest'>
            <MenuItem value='Forest'>Forest</MenuItem>
          </TextField>
          <TextField
            select
            label='Difficulty'
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            helperText={`${difficultyMultiplier(difficulty)}× enemy health and damage`}
          >
            {Object.values(Difficulty).map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
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
