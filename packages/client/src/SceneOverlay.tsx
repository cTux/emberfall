import type { SceneState, Enemy, Player } from '@emberfall/common';
import { enemyMaxHealth } from '@emberfall/core';
import { GameWindow, BossHealth, SceneStatus } from '@emberfall/ui';
import { Box, Stack, Typography, Button } from '@mui/material';

export function SceneOverlay({
  scene,
  boss,
  me,
  remaining,
  departure,
  playerId,
  displayedHp,
  deathWindow,
  setDeathWindow,
  unavailable,
  onReturnLobby,
}: {
  scene?: SceneState;
  boss?: Enemy;
  me?: Player;
  remaining: number;
  departure: number;
  playerId: string;
  displayedHp: Record<string, number>;
  deathWindow: boolean;
  setDeathWindow: (open: boolean) => void;
  unavailable: boolean;
  onReturnLobby: () => void;
}) {
  return (
    <>
      {scene?.phase === 'countdown' && (
        <div className='departure-countdown' role='status' aria-label={`Departing in ${departure}`}>
          <span key={`${scene.id}:${scene.countdownAt}:${departure}`}>{departure}</span>
        </div>
      )}
      {boss && (
        <Box className='boss-hud'>
          <BossHealth
            name={boss.name ?? 'The Hollow Warden'}
            health={boss.hitpoints}
            maxHealth={enemyMaxHealth(boss, scene?.difficulty)}
          />
        </Box>
      )}
      {me?.scene === 'forest' && !boss && (
        <Box className='scene-clock'>
          <SceneStatus
            label={
              scene?.phase === 'ended'
                ? 'Scene complete · Return portal open'
                : scene?.bossId !== undefined
                  ? 'Defeat the boss'
                  : 'Forest'
            }
            seconds={
              scene?.phase === 'ended' || scene?.bossId !== undefined ? undefined : remaining
            }
          />
        </Box>
      )}
      {me?.scene === 'forest' &&
        (displayedHp[playerId] ?? me.hitpoints) <= 0 &&
        (deathWindow ? (
          <Box className='death-panel'>
            <GameWindow
              title='You have fallen'
              modal={false}
              onClose={() => {
                return setDeathWindow(false);
              }}
            >
              <Stack spacing={2}>
                <Typography>Your party can continue fighting.</Typography>
                <Button variant='contained' disabled={unavailable} onClick={onReturnLobby}>
                  Return to lobby
                </Button>
              </Stack>
            </GameWindow>
          </Box>
        ) : (
          <Button
            className='interact'
            onClick={() => {
              return setDeathWindow(true);
            }}
          >
            You have fallen · Return options
          </Button>
        ))}
    </>
  );
}
