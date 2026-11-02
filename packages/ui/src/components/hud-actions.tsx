import type { HudAction } from './hud-action.tsx';
import { Stack, Tooltip } from '@mui/material';
import { HudActionButtonStyled, HudShortcutStyled } from './styles';

// A minute contains sixty seconds; pad seconds to two digits for the mm:ss timer.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export function HudActions({ actions }: { actions: HudAction[] }) {
  return (
    <Stack component='nav' aria-label='Game controls' direction='row' spacing={1}>
      {actions.map((action) => {
        return (
          <Tooltip
            title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
            key={action.id}
          >
            <span>
              <HudActionButtonStyled
                aria-label={action.label}
                aria-keyshortcuts={action.shortcut === 'Esc' ? 'Escape' : action.shortcut}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                <FontAwesomeIcon icon={action.icon} aria-hidden='true' />
                {action.shortcut && (
                  <HudShortcutStyled aria-hidden='true'>{action.shortcut}</HudShortcutStyled>
                )}
              </HudActionButtonStyled>
            </span>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
