import { lazy, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AccountView, ClientMessage, Player, WorldState, Difficulty } from '@emberfall/common';
import { GameWindow } from '@emberfall/ui';
import { Box, Stack, Typography } from '@mui/material';
import { DeferredContent } from './DeferredContent';
import { gamePanel, type GameMenu } from './game-panels';
import { ResetTalentsPanel, WardrobePanel } from './CharacterPanels';
import { LeavePanel, PortalPanel } from './WorldPanels';
import type { Preferences } from './preferences';
import type { GraphicsSettings } from './graphics';

const Anvil = lazy(() => {
  return import('./Anvil').then((module) => {
    return { default: module.Anvil };
  });
});

const Talents = lazy(() => {
  return import('./Talents').then((module) => {
    return { default: module.Talents };
  });
});
const Tactics = lazy(() => {
  return import('./Tactics').then((module) => {
    return { default: module.Tactics };
  });
});
const Equipment = lazy(() => {
  return import('./equipment-view').then((module) => {
    return { default: module.Equipment };
  });
});
const Trading = lazy(() => {
  return import('./equipment-view').then((module) => {
    return { default: module.Trading };
  });
});
const Storehouse = lazy(() => {
  return import('./Storehouse').then((module) => {
    return { default: module.Storehouse };
  });
});
const Codex = lazy(() => {
  return import('./Codex').then((module) => {
    return { default: module.Codex };
  });
});
const Settings = lazy(() => {
  return import('./Settings').then((module) => {
    return { default: module.Settings };
  });
});

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
  const onRename = useCallback(() => {
    onClose();
    rename();
  }, [onClose, rename]);
  const onLogout = useCallback(() => {
    void logout();
  }, [logout]);
  const portal = () => {
    return (
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
    );
  };

  const panels: Record<GameMenu, () => import('react').ReactNode> = {
    anvil: () => {
      return me ? <Anvil player={me} send={send} disabled={unavailable} /> : portal();
    },
    resetTalents: () => {
      return me ? (
        <ResetTalentsPanel me={me} unavailable={unavailable} send={send} onClose={onClose} />
      ) : (
        portal()
      );
    },
    talents: () => {
      return me ? <Talents player={me} send={send} /> : portal();
    },
    codex: () => {
      return <Codex />;
    },
    tactics: () => {
      return me ? <Tactics player={me} send={send} disabled={unavailable} /> : portal();
    },
    equipment: () => {
      return me ? <Equipment player={me} send={send} /> : portal();
    },
    settings: () => {
      return (
        <Settings
          account={account}
          onRename={onRename}
          onLogout={onLogout}
          tab={settingsTab}
          onTab={setSettingsTab}
          preferences={preferences}
          setPreferences={setPreferences}
          graphics={graphics}
          setGraphics={setGraphics}
        />
      );
    },
    exit: () => {
      return (
        <LeavePanel me={me} unavailable={unavailable} send={send} act={act} onClose={onClose} />
      );
    },
    wardrobe: () => {
      return <WardrobePanel me={me} unavailable={unavailable} send={send} scene={scene} />;
    },
    building: () => {
      if (tradingNpcId && me && world?.merchant) {
        return (
          <Trading
            key={tradingNpcId}
            player={me}
            merchant={tradingNpcId === 'craftsman' ? world.merchant.craftsman! : world.merchant}
            craftsman={tradingNpcId === 'craftsman'}
            send={send}
          />
        );
      }

      if (building === 'Storehouse' && me) {
        return <Storehouse player={me} send={send} />;
      }

      return <Typography>{building} services are coming in a future update.</Typography>;
    },
    portal,
  };

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
            <Stack spacing={2}>{panels[menu]()}</Stack>
          </DeferredContent>
        </GameWindow>
      </Box>
    )
  );
}
