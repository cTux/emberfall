import { lazy, type Dispatch, type SetStateAction } from 'react';
import type { AccountView, ClientMessage, Player, WorldState, Difficulty } from '@emberfall/common';
import { GameWindow } from '@emberfall/ui';
import { Box, Stack, Typography } from '@mui/material';
import { DeferredContent } from './DeferredContent';
import { gamePanel, type GameMenu } from './game-panels';
import { ResetTalentsPanel, WardrobePanel } from './CharacterPanels';
import { LeavePanel, PortalPanel } from './WorldPanels';
import type { Preferences } from './preferences';
import type { GraphicsSettings } from './graphics';

const Talents = lazy(() => import('./Talents').then((module) => ({ default: module.Talents })));
const Tactics = lazy(() => import('./Tactics').then((module) => ({ default: module.Tactics })));
const Equipment = lazy(() =>
  import('./equipment-view').then((module) => ({ default: module.Equipment })),
);
const Trading = lazy(() =>
  import('./equipment-view').then((module) => ({ default: module.Trading })),
);
const Storehouse = lazy(() =>
  import('./Storehouse').then((module) => ({ default: module.Storehouse })),
);
const Codex = lazy(() => import('./Codex').then((module) => ({ default: module.Codex })));
const Settings = lazy(() => import('./Settings').then((module) => ({ default: module.Settings })));

export function GamePanels({
  menu,
  building,
  tradingNpcId,
  me,
  world,
  playerId,
  unavailable,
  send,
  act,
  account,
  rename,
  logout,
  settingsTab,
  setSettingsTab,
  preferences,
  setPreferences,
  graphics,
  setGraphics,
  departure,
  canRegenerate,
  difficulty,
  setDifficulty,
  onClose,
}: {
  menu: GameMenu | null;
  building: string;
  tradingNpcId: string | null;
  me?: Player;
  world: WorldState | null;
  playerId: string;
  unavailable: boolean;
  send: (message: ClientMessage) => void;
  act: (message: ClientMessage) => void;
  account: AccountView;
  rename: () => void;
  logout: () => Promise<void>;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  graphics: GraphicsSettings;
  setGraphics: Dispatch<SetStateAction<GraphicsSettings>>;
  departure: number;
  canRegenerate: boolean;
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
  onClose: () => void;
}) {
  const scene = world?.scene;

  return (
    menu && (
      <Box
        sx={
          menu === 'talents'
            ? {
                position: 'absolute',
                zIndex: 5,
                inset: '32px 16px auto',
                pointerEvents: 'none',
                '& > section': { pointerEvents: 'auto' },
              }
            : undefined
        }
      >
        <GameWindow key={menu} {...gamePanel(menu, building, !!tradingNpcId)} onClose={onClose}>
          <DeferredContent key={menu}>
            <Stack spacing={2}>
              {menu === 'resetTalents' && me ? (
                <ResetTalentsPanel
                  me={me}
                  unavailable={unavailable}
                  send={send}
                  onClose={onClose}
                />
              ) : menu === 'talents' && me ? (
                <Talents player={me} send={send} />
              ) : menu === 'codex' ? (
                <Codex />
              ) : menu === 'tactics' && me ? (
                <Tactics player={me} send={send} disabled={unavailable} />
              ) : menu === 'equipment' && me ? (
                <Equipment player={me} send={send} />
              ) : menu === 'settings' ? (
                <Settings
                  account={account}
                  onRename={() => {
                    onClose();
                    rename();
                  }}
                  onLogout={() => {
                    void logout();
                  }}
                  tab={settingsTab}
                  onTab={setSettingsTab}
                  preferences={preferences}
                  setPreferences={setPreferences}
                  graphics={graphics}
                  setGraphics={setGraphics}
                />
              ) : menu === 'exit' ? (
                <LeavePanel
                  me={me}
                  unavailable={unavailable}
                  send={send}
                  act={act}
                  onClose={onClose}
                />
              ) : menu === 'wardrobe' ? (
                <WardrobePanel me={me} unavailable={unavailable} send={send} scene={scene} />
              ) : menu === 'building' && tradingNpcId && me && world?.merchant ? (
                <Trading
                  key={tradingNpcId}
                  player={me}
                  merchant={
                    tradingNpcId === 'craftsman' ? world.merchant.craftsman! : world.merchant
                  }
                  craftsman={tradingNpcId === 'craftsman'}
                  send={send}
                />
              ) : menu === 'building' && building === 'Storehouse' && me ? (
                <Storehouse player={me} send={send} />
              ) : menu === 'building' ? (
                <Typography>{building} services are coming in a future update.</Typography>
              ) : (
                <PortalPanel
                  world={world}
                  scene={scene}
                  playerId={playerId}
                  me={me}
                  departure={departure}
                  unavailable={unavailable}
                  send={send}
                  canRegenerate={canRegenerate}
                  difficulty={difficulty}
                  setDifficulty={setDifficulty}
                  onClose={onClose}
                />
              )}
            </Stack>
          </DeferredContent>
        </GameWindow>
      </Box>
    )
  );
}
