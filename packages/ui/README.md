# Emberfall UI

A source-exported React component library used by the game client and Storybook. Storybook is the review surface; its screen examples use local demo state and never connect to a game server.

## Run and verify

From the repository root:

```sh
pnpm install
pnpm --filter @emberfall/ui storybook
pnpm --filter @emberfall/ui typecheck
pnpm --filter @emberfall/ui build
pnpm --filter @emberfall/ui test
```

Open http://localhost:6006. `build` produces the static Storybook in `packages/ui/dist`. Tests start their own Storybook on port 6007 and use the workspace's Playwright dependency. Install Chromium once with `pnpm exec playwright install chromium` if needed.

## Visual contract

One dark forest theme: green-black surfaces, parchment text, warm ember primary actions, green health, blue mana, red danger. Alegreya Sans matches the game and is bundled locally under the SIL Open Font License. No external font service, game art dependency, gradients or ornamental frames.

`gameTheme` owns palette, typography, spacing, corners and MUI defaults. Use semantic colors such as `primary.main`, `text.secondary`, `divider`, `success` and `info`. Use the theme's spacing scale and responsive breakpoints. Preserve focus rings, readable contrast, reduced motion, labels, loading and disabled states. This library deliberately provides one color scheme.

## Reuse first

The client depends on `@emberfall/ui: workspace:*` and the MUI/React dependencies it imports. It mounts `GameUiProvider` once, composes these components around its existing game state and server actions, and serves the bundled fonts at `/fonts`.

```tsx
import { GameUiProvider, PartyCard } from "@emberfall/ui";
import { Button, Stack } from "@mui/material";

function GameInterface() {
  return (
    <GameUiProvider>
      <Stack spacing={2}>
        <PartyCard
          name="Astrid"
          level={1}
          health={80}
          maxHealth={100}
          mana={35}
          maxMana={50}
          local
        />
        <Button variant="contained">Enter forest</Button>
      </Stack>
    </GameUiProvider>
  );
}
```

Mount the provider once at the UI root. It includes `CssBaseline`; avoid mounting it over unrelated UI without reviewing its global effect. Serve `public/fonts` at `/fonts` in the host, or override the theme font face URLs for your asset pipeline. Source exports are intended for this TypeScript/Vite workspace, not direct unbundled Node imports.

Use MUI directly for Button, IconButton, TextField, Select/MenuItem, Checkbox, Slider, Tabs, Alert, Chip, Tooltip, Paper and layout. Their shared style comes from the theme; do not create a renamed wrapper for every primitive. Use Font Awesome individual imports for UI icons; give icon-only buttons an accessible name and hide decorative icons from assistive technology.

## Game components

Windows are 400px wide with a maximum height of 480px, clamped to the viewport with a 16px margin. Settings uses a fixed 420px height across tabs. The title stays visible while window content scrolls internally. Compact typography, switches and tabs come from the shared theme.

| Component          | Responsibility and inputs                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GameWindow         | Controlled `open`, `title`, `onClose`, children; `modal=false` for inline panels. Modal focus trap, Escape and focus restoration come from MUI. Pointer-drag the title; positions persist when the host provides `PanelPositionContext`; `positionKey` defaults to the window title. |
| StatusMeter        | `label`, `value`, `max`, semantic `color`. Clamps invalid/overflow values; exposes actual units to assistive technology.                                                                                                                                                             |
| PartyCard          | Name, level, HP/MP, optional portrait/host/local/away. Also supports companions without mana. Away status is explicit text for readability.                                                                                                                                          |
| WorldList          | Typed world summaries, selected ID, disabled state, join/create callbacks; handles locked, full and empty states.                                                                                                                                                                    |
| ChoiceCard         | Title, description, details, icon, selected/disabled and `onSelect`. Reuse for general exclusive choices.                                                                                                                                                                            |
| SettingToggle      | Controlled label, checked/disabled and boolean `onChange`.                                                                                                                                                                                                                           |
| VolumeControl      | Controlled label, value in 0–1, disabled and numeric `onChange`. MUI supplies keyboard operation.                                                                                                                                                                                    |
| ChapterTabs        | Typed chapter IDs/titles/content, controlled value/callback. Linked tab/panel IDs support multiple instances. Reuse for Codex, lobby and settings.                                                                                                                                   |
| ConnectionStatus   | Colored connection circle with an accessible status label.                                                                                                                                                                                                                           |
| HudActions         | Typed labeled icon actions with callbacks and disabled state.                                                                                                                                                                                                                        |
| BossHealth         | Name and health/maxHealth; composes StatusMeter.                                                                                                                                                                                                                                     |
| InteractionPrompt  | Action and optional key text.                                                                                                                                                                                                                                                        |
| SceneStatus        | Label and optional seconds; formats a nonnegative mm:ss timer. Host owns the clock.                                                                                                                                                                                                  |
| PortalVote         | Scene/difficulty, ready/total, voted, optional countdown, disabled and vote callback. Host owns voting rules.                                                                                                                                                                        |
| PerformanceMonitor | Caller-supplied FPS/latency samples, optional series visibility; renders last 60 samples and gaps for unavailable readings. Host owns sampling frequency and time window.                                                                                                            |

`ClassCard` presents a portrait, two independently focusable weapon/spell tooltip buttons, rounded stats and a selection button. Its host supplies all content and selection restrictions. `GameWindow.width` defaults to 400; the wardrobe uses 600.

All consumer-facing prop/data types are exported from `src/index.ts`. Screen stories demonstrate lobby, HUD, settings, wardrobe, Codex, portal vote, leave confirmation, death and building service placeholders by composing these components. Those compositions are examples, not duplicated application state machines. No network calls, persistence, gameplay calculations, authorization or game-package imports belong here.

## Create a component

`EquipmentPanel` accepts controlled slot views (ID, label, grid coordinates,
fallback image, allowed gear text and optional item name/icon/badges) and calculated
stat rows. Slots are borderless and empty images are translucent. Focus/hover/touch
opens a narrow translucent-black tooltip outside the window's scrollable content,
without adding scrollbars or clipping details. Modal tooltips remain inside the
dialog's focus scope, and Tab/Shift+Tab connect the slot and its first badge.
Item badges use the bundled generated
atlas, optional bottom-right values and host-supplied explanations accessible by
mouse, keyboard and touch. It places character stats on the right on desktop and below at narrow widths.
Compose it inside `GameWindow` for dragging and focus management. Its Storybook
stories cover starter and empty loadouts; gameplay rules remain in the host.

1. Search this package and MUI first. Reuse an existing component or compose primitives when that already covers the need.
2. Add a game component only for repeated semantic markup, accessibility or behavior. Pass typed data and callbacks; keep fetching, storage, routing and server rules in the host.
3. Keep component and private types together. Use a component directory only when multiple files are needed. Export the public component and props from `src/index.ts`.
4. Put global visual rules in `theme.tsx`. Put reusable component-specific `styled()` rules in a colocated `styles.ts`, with named `SomethingStyled` exports. Use `sx` for short local layout adjustments. Filter custom style props; use documented MUI slots rather than generated CSS classes.
5. Add a Storybook story for every exported component. Include realistic, empty, disabled/loading, error and edge states where relevant. Use local demo state so controls respond.
6. Run typecheck, Storybook build and focused browser tests. Check keyboard operation, accessible names, focus, narrow screens and reduced motion. Extend tests when adding meaningful behavior, not when adding a trivial wrapper.

These rules follow the global `customize-material-ui` and `build-react-ui-components` skills. Their styling hierarchy applies here: theme → MUI component defaults → colocated styled rules → small local `sx`. The package README is rendered directly in Storybook so the two guides cannot drift.

## Boundaries and acceptance

- Shared presentation lives in `packages/ui`; client compositions, persistence and server actions remain in `packages/client`.
- Storybook previews each shared game pattern and all current screen needs without running the server.
- Reusable components own presentation and controlled callbacks; the host retains game state and rules.
- The client uses the same components and theme as Storybook. Game rules and the server protocol are unchanged by UI integration.
- `typecheck`, static build and browser checks must pass. Inspect desktop and narrow layouts before changing consumers.

Sources: [MUI installation](https://mui.com/material-ui/getting-started/installation/), [MUI theming](https://mui.com/material-ui/customization/theming/), [Storybook React + Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite/).
