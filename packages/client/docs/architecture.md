# Client loading and responsibilities

[Back to PixiJS client](../README.md).

Code paths in this guide are relative to `packages/client` unless prefixed with another package or repository directory.

## Loading boundaries

`main.tsx` loads the account gate and shared UI first. `Game.tsx` loads only after
account access succeeds; its world browser does not initialize Pixi or sprite
atlases. Joining a world loads `Arena.tsx` and the action bar together. Settings,
Codex, inventory/trading, talents, tactics and storage load when their windows open.
`?art-gallery` and `?class-movement` load only their selected gallery.

Keep URL-only artwork helpers in `class-art.ts` and talent icon presentation in
`talent-icons.tsx`; importing atlas or panel modules from the entry point defeats
these boundaries. Local loading/error boundaries keep windows closable and offer
Reload if a chunk cannot load. Loading announcements remain available to screen
readers without displaying a loading label. Vite chooses shared chunks without a single vendor
bucket; `dist/.vite/manifest.json` records the production import graph.

## Responsibilities

`style.scss` preserves stylesheet order while `styles/scene.scss`,
`styles/meters.scss` and `styles/feedback.scss` own scene layout, diagnostic
meters and transient feedback. Cursor styles remain first.

`Account.tsx` loads the server account before entering the game. First Steam login
opens the nickname dialog; Settings → Account reuses it for editing. The nickname
belongs to the account, while graphics/audio preferences remain in localStorage.
`connection.ts` exchanges the HttpOnly session cookie for a short-lived, single-use
Colyseus admission ticket. It never stores Steam/session credentials in localStorage.
Configure the server as described in [operations](../../../docs/operations/steam.md#steam-login-new-runtime).

- `connection.ts` adapts the Colyseus SDK to typed application events. Application
  recovery retains existing world/character behavior; automatic SDK reconnect
  is disabled so the two mechanisms cannot create competing sessions.
- `useGameSession.ts` owns connection/version checks, recovery, latency probes,
  session storage and command admission. `Game.tsx` consumes its state and small
  lifecycle events to reset presentation without owning sockets or credentials.
- `WorldBrowser.tsx`, `CharacterPanels.tsx` and `WorldPanels.tsx` are controlled
  views for world entry, character configuration and scene/leave actions.
  `game-panels.ts` declares window titles, dimensions and modal behavior; the
  host still owns actions, selection and lazy content loading.
- `GameControls.tsx`, `PartyHud.tsx` and `SceneOverlay.tsx` render controlled
  navigation, party vitals and scene/death feedback. Their callbacks return
  decisions to the host; they do not own network or prediction state.
- `useGameHotkeys.ts`, `useGamePreferences.ts` and `useWorldChat.ts` own
  keyboard subscriptions, browser preference persistence and world chat binding.
  `GamePanels.tsx` composes controlled lazy panel content; `Game.tsx` retains
  session-driven window state and interaction commands.
- `village.ts` assembles scenery and torch descriptors; `light-texture.ts`
  owns the bounded silhouette/light cache shared with forest rendering, and
  `torch-rendering.ts` owns the packaged hanging-lamp animation.
- `art-loader.ts` owns shared image caching, atlas packaging and readiness;
  `art.ts` declares shipped artwork and terrain drawing. Atlas correction,
  native building loading and softened actor palettes keep their original order.
- `equipment/` owns item artwork, stat and badge presentation, backpack view
  models and the controlled trading panel. Storehouse consumes the backpack
  model directly; `equipment-view.tsx` retains its lazy panel exports.
- `codex/chapters.ts` declares chapter order while gameplay, character and
  credit content live in separate modules. Codex remains a lazy-loaded panel.
- `settings-controls.ts` and `tactics-controls.ts` declare typed control labels,
  choices and relationships. Settings graphics and tactics priority lists are
  controlled views; their hosts retain preference updates and server commands.
- `snapshots.ts` interpolates confirmed remote state. `local-movement.ts`
  predicts bounded local movement and casts, reconciles acknowledgements and
  replays pending input. `local-attacks.ts` owns cast identity and swing timing;
  `local-projectiles.ts` adopts and reconciles detached projectile visuals against
  confirmed frames. Hits, health, loot and progress remain authoritative.
- `presentation/world.ts` owns the Miniplex presentation entities. These are
  detached render/prediction objects, separate from Colyseus schemas and server
  ECS objects. Companions remain based on confirmed state.
- `arena-input.ts` owns pointer/keyboard listeners, held-input state and the
  fixed input timer, with one disposal path. Arena supplies live state readers
  and passes movement into presentation-only prediction.
- `frame-budget.ts` owns drawing cadence, adaptive resolution thresholds and
  FPS sampling; simulation time stays server-owned.
- `effects.ts` and `combat-effects.ts` preserve their exports while delegating
  to label, world, hit/outline, blood, loot, projectile and debuff modules under
  `effects/`. Each cache stays with the effect that owns it.
- Forest rendering composes cached terrain, actor preparation, ordered layers
  and actor drawing through `forest-ground.ts`, `forest-actors.ts`,
  `forest-layers.ts` and `forest-actor-rendering.ts`. Portal, fog and player effects
  are shared modules; the existing `forest.ts` exports remain compatible.
- `village-players.ts` owns village player poses, cutouts, caster preparation
  and drawing. `village-layers.ts` declares stable scene ordering, and
  `village-layer-rendering.ts` renders scenery, dummies, companions and portals
  from controlled frame inputs.
- `village-frame.ts` prepares wrapped camera/scenery data and diagnostics;
  `village-lighting.ts` draws world lights from those frame inputs. `VillageSpeech`
  owns local cat speech and dialogue overlays. `environment-rendering.ts` shares
  the same particle/fog/atmosphere/vignette order between forest and village.
- `VillageScene` composes per-mount village players, critter motion and speech,
  prepares render frames and preserves the drawing/overlay order. Arena retains
  input selection and action dispatch, using scene targets as presentation data.
- `interaction-presentation.ts` owns gathering indicator clock alignment,
  prompt display and shared hover/nearby selection and diagnostics. Input
  admission and authoritative gathering rules remain with their existing owners.
- `Arena.tsx` renders the canvas and diagnostic HUD. `useArenaRenderer.ts` owns
  React input synchronization and the render/input lifecycle; `arena-presentation.ts`
  owns snapshot playback, prediction, camera/aim projection, presentation entities
  and audio/HP feedback. Scene renderers consume detached frame data. Shared UI
  components come from the shared `@emberfall/ui` package; the host owns
  actions and subscriptions.
- `rendering/pixi-context.ts` translates existing drawing commands into pooled
  native Pixi sprites, geometry, text and masks. The visible canvas is WebGL.
  `rendering/paints.ts` owns normalized gradient ramp textures, camera-independent
  cache keys, expiry and destruction. `rendering/visual-pools.ts` owns pooled
  sprites/geometry/text, ordered placement, clip groups and release/trim rules.
  `rendering/drawing-state.ts` owns saved styles and transforms, shared by the
  command adapter. `rendering/drawing-context.ts` declares supported commands
  and world-rendering extensions; shared draw helpers also accept native Canvas
  contexts for asset baking and pixel comparison. `rendering/drawing-path.ts`
  owns path replay and dash/ellipse geometry; `rendering/image-textures.ts` owns
  source uploads, atlas frame reuse and dynamic texture revisions. Arena passes the adapter
  directly, without a cast that claims full Canvas API support.
  `rendering/renderer-driver.ts` owns GPU startup, resize, filter-binding release
  and shutdown. Player occlusion, baked glow primitives, text styling and shared
  transform math have separate owners under `rendering/`.
  Canvas 2D is used to bake assets, light masks and small glow primitives, not
  to upload a complete world frame as a texture.

## Bundled content

The [mod design](../../../docs/design/mods.md) initializes the same `GAME_MODS`
catalog as the server before gameplay rendering or prediction. Class, equipment
slot and extra numeric stat views use registered metadata; additional classes
and enemies reuse declared art families. UI stays controlled and independent of
game packages. Rebuild both host bundles when the mod list changes.
