import { Box } from '@mui/material';
import { HudActions, ConnectionStatus } from '@emberfall/ui';
import type { GameMenu } from './game-panels';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons/faWandMagicSparkles';
import { faChessKnight } from '@fortawesome/free-solid-svg-icons/faChessKnight';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons/faBookOpen';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons/faRightFromBracket';
import { faDoorOpen } from '@fortawesome/free-solid-svg-icons/faDoorOpen';
import { faGlobe } from '@fortawesome/free-solid-svg-icons/faGlobe';
import { faBagShopping } from '@fortawesome/free-solid-svg-icons/faBagShopping';

export function GameControls({
  hasWorld,
  canVote,
  unavailable,
  browserOpen,
  status,
  onMenu,
  onOpenBrowser,
}: {
  hasWorld: boolean;
  canVote: boolean;
  unavailable: boolean;
  browserOpen: boolean;
  status: string;
  onMenu: (menu: GameMenu) => void;
  onOpenBrowser: () => void;
}) {
  return (
    <>
      <Box className='controls'>
        <HudActions
          actions={[
            ...(hasWorld
              ? [
                  {
                    id: 'equipment',
                    label: 'Inventory',
                    shortcut: 'I',
                    icon: faBagShopping,
                    onClick: () => {
                      return onMenu('equipment');
                    },
                  },
                  {
                    id: 'talents',
                    label: 'Talents',
                    shortcut: 'N',
                    icon: faWandMagicSparkles,
                    onClick: () => {
                      return onMenu('talents');
                    },
                  },
                  {
                    id: 'tactics',
                    label: 'Tactics',
                    shortcut: 'T',
                    icon: faChessKnight,
                    onClick: () => {
                      return onMenu('tactics');
                    },
                  },
                ]
              : []),
            {
              id: 'codex',
              label: 'Codex',
              shortcut: 'F1',
              icon: faBookOpen,
              onClick: () => {
                return onMenu('codex');
              },
            },
            ...(canVote
              ? [
                  {
                    id: 'portal',
                    label: 'Portal vote',
                    icon: faDoorOpen,
                    onClick: () => {
                      return onMenu('portal');
                    },
                  },
                ]
              : []),
            {
              id: 'settings',
              label: 'Settings',
              shortcut: 'Esc',
              icon: faGear,
              onClick: () => {
                return onMenu('settings');
              },
            },
            ...(hasWorld
              ? [
                  {
                    id: 'leave',
                    label: 'Leave world',
                    icon: faRightFromBracket,
                    disabled: unavailable,
                    onClick: () => {
                      return onMenu('exit');
                    },
                  },
                ]
              : []),
            ...(!hasWorld && !browserOpen
              ? [
                  {
                    id: 'browser',
                    label: 'World browser',
                    icon: faGlobe,
                    onClick: onOpenBrowser,
                  },
                ]
              : []),
          ]}
        />
      </Box>
      <Box className='connection'>
        <ConnectionStatus
          status={
            status === 'Connected'
              ? 'connected'
              : status === 'Connecting'
                ? 'connecting'
                : 'disconnected'
          }
        />
      </Box>
    </>
  );
}
