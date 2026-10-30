import { GameControls } from './GameControls';
import { PartyHud } from './PartyHud';
import { SceneOverlay } from './SceneOverlay';
import { gamePanel, type GameMenu } from './game-panels';
import { WorldBrowser } from './WorldBrowser';
import { ResetTalentsPanel, WardrobePanel } from './CharacterPanels';
import { LeavePanel, PortalPanel } from './WorldPanels';
import { useGameSession } from './useGameSession';
import { BULLSEYE } from '@emberfall/core';
import type { AccountView, ChatMessage, WorldSummary } from '@emberfall/common';
import { Difficulty, hasLivingScenePlayers } from '@emberfall/common';
import { INNKEEPER } from '@emberfall/core';
import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeferredContent } from './DeferredContent';
import type { Interaction } from './effects';
import { GameWindow } from '@emberfall/ui';
import { Box, Stack, Typography } from '@mui/material';
import type { Preferences } from './preferences';
import type { Dispatch, SetStateAction } from 'react';
import { useChat } from './ChatProvider';
import { loadGraphics } from './graphics';

const Arena = lazy(() => import('./Arena').then((module) => ({ default: module.Arena })));
const WeaponActionBar = lazy(() =>
  import('./WeaponActionBar').then((module) => ({ default: module.WeaponActionBar })),
);
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

export function Game({
  account,
  rename,
  logout,
  refresh,
  preferences,
  setPreferences,
}: {
  account: AccountView;
  rename: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
}) {
  const steam = account.mode === 'steam';
  const { reportError, configureChat } = useChat();
  const { status, latency, worlds, world, playerId, pending, retry, send, act } = useGameSession({
    steam,
    refresh,
    reportError,
    onEvent: (event) => {
      if (event === 'voting') {
        setMenu((current) => current ?? 'portal');
        return;
      }
      setMenu(null);
      if (event === 'joined') {
        setCatMessages([]);
        setJoinPassword('');
        setSelected(null);
      }
      if (event === 'sceneChanged') setDeathWindow(true);
      if (event === 'left' || event === 'resumeFailed' || event === 'disconnected')
        setBrowserOpen(true);
      if (event === 'left' || event === 'disconnected') setTab('browse');
      if (event === 'disconnected') {
        setSelected(null);
        setJoinPassword('');
      }
    },
  });
  const interaction = useRef<Interaction | null>(null);
  const cursorAim = useRef<(() => { aimX: number; aimY: number }) | null>(null);
  const setCursorAim = useCallback((reader: (() => { aimX: number; aimY: number }) | null) => {
    cursorAim.current = reader;
  }, []);
  const [displayedHp, setDisplayedHp] = useState<Record<string, number>>({});
  const [catMessages, setCatMessages] = useState<
    { worldId: string; afterId?: string; message: ChatMessage }[]
  >([]);
  const catSpoke = (text: string) => {
    if (!world) return;
    setCatMessages((messages) =>
      [
        ...messages.filter((entry) => entry.worldId === world.id),
        {
          worldId: world.id,
          afterId: world.chat?.at(-1)?.id,
          message: {
            id: crypto.randomUUID(),
            playerId: '',
            name: 'Cat',
            text,
            dimension: 'village',
          },
        },
      ].slice(-10),
    );
  };
  const chatMessages = useMemo(() => {
    const localChatAfter = (id?: string) =>
      catMessages
        .filter((entry) => entry.worldId === world?.id && entry.afterId === id)
        .map((entry) => entry.message);
    return [
      ...localChatAfter(),
      ...(world?.chat ?? []).flatMap((message) => [message, ...localChatAfter(message.id)]),
    ];
  }, [world, catMessages]);
  const [legacyName, setName] = useState(() => {
    try {
      return localStorage.getItem('emberfall-new.nickname')?.slice(0, 24) || 'Wanderer';
    } catch {
      return 'Wanderer';
    }
  });
  const name = steam ? account.nickname! : legacyName;
  const [menu, setMenu] = useState<GameMenu | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Easy);
  const [building, setBuilding] = useState('');
  const [settingsTab, setSettingsTab] = useState('gameplay');
  const [browserOpen, setBrowserOpen] = useState(true);
  const [deathWindow, setDeathWindow] = useState(true);
  useEffect(() => {
    document.body.dataset.customCursor = String(preferences.customCursor);
    document.body.dataset.cursorSize = String(preferences.cursorSize);
    try {
      localStorage.setItem('emberfall-new.preferences', JSON.stringify(preferences));
    } catch {
      /* Session preferences still apply. */
    }
  }, [preferences]);
  const [graphics, setGraphics] = useState(loadGraphics);
  useEffect(() => {
    try {
      localStorage.setItem('emberfall-new.graphics', JSON.stringify(graphics));
    } catch {
      /* Settings still apply to this session. */
    }
  }, [graphics]);
  useEffect(() => {
    try {
      if (!steam) localStorage.setItem('emberfall-new.nickname', name);
    } catch {
      /* Storage may be disabled. */
    }
  }, [name, steam]);
  const [joinPassword, setJoinPassword] = useState('');
  const [selected, setSelected] = useState<WorldSummary | null>(null);
  const [tab, setTab] = useState<'browse' | 'create'>('browse');
  const unavailable = status !== 'Connected' || pending;
  const tradingNpcId =
    menu === 'building'
      ? building === INNKEEPER.name
        ? INNKEEPER.id
        : building === 'Bram the Craftsman'
          ? 'craftsman'
          : null
      : null;
  useEffect(() => {
    send({ type: 'npcInteraction', npcId: tradingNpcId });
  }, [tradingNpcId, send]);
  const me = world?.players.find((p) => p.id === playerId);
  const scene = world?.scene;
  useEffect(() => {
    configureChat({
      worldId: world?.id,
      scene: me?.scene ?? 'village',
      messages: chatMessages,
      isVisible: (message) =>
        message.excludedPlayerId !== playerId &&
        (!message.dimension || message.dimension === (me?.scene ?? 'village')),
      send,
      disabled: !world || status !== 'Connected',
    });
  }, [world, chatMessages, me?.scene, playerId, status, send, configureChat]);
  useEffect(() => () => configureChat(null), [configureChat]);
  const castTalent = (slot: number, automatic = false) => {
    const aim = cursorAim.current?.();
    if (!me || unavailable || !aim) return;
    send({
      type: 'talentCast',
      automatic,
      ...aim,
      slot,
      classId: me.classId ?? 'warrior',
      epoch: me.scene === 'forest' ? (scene?.id ?? '') : 'lobby',
    });
  };
  const interact = (source = interaction.current) => {
    if (me?.gathering && interaction.current?.activate && source?.id.startsWith('gather:')) {
      interaction.current.activate();
      return;
    }
    if (!source) return;
    if (source.activate) {
      source.activate();
      return;
    }
    if (source.id.startsWith('party:')) {
      send({ type: 'partyInteract', targetId: source.id.slice(6) });
      return;
    }
    if (source.id.startsWith('gather:')) {
      if (me)
        send({
          type: 'gather',
          nodeId: source.id.slice(7),
          epoch: me.scene === 'forest' ? (world?.scene?.id ?? '') : 'lobby',
        });
    } else if (source.id === 'return') send({ type: 'returnLobby' });
    else if (source.id === BULLSEYE?.id) setMenu('resetTalents');
    else if (source.id === 'wardrobe') setMenu('wardrobe');
    else if (source.id === 'portal') setMenu('portal');
    else {
      setBuilding(source.name);
      setMenu('building');
    }
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code === 'F1') event.preventDefault();
      if (event.repeat) return;
      const typing =
        event.target instanceof Element &&
        !!event.target.closest('input, textarea, select, [contenteditable=true]');
      if (
        event.code === 'KeyT' &&
        world &&
        !typing &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (menu === 'tactics' ||
          (!menu && !document.querySelector('[role="dialog"][aria-modal="true"]')))
      ) {
        event.preventDefault();
        setMenu(menu === 'tactics' ? null : 'tactics');
        return;
      }
      if (
        event.code === 'KeyN' &&
        world &&
        !typing &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (!menu || menu === 'talents')
      ) {
        event.preventDefault();
        setMenu(menu === 'talents' ? null : 'talents');
        return;
      }
      if (
        /^Digit[1-4]$/.test(event.code) &&
        world &&
        !typing &&
        (!menu || menu === 'talents') &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        castTalent(Number(event.code.slice(-1)) - 1);
        return;
      }
      if (event.key === 'Escape' && menu === 'talents') {
        event.preventDefault();
        setMenu(null);
        return;
      }
      if (
        event.code === 'KeyI' &&
        world &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !typing &&
        (menu === 'equipment' ||
          (!menu && !document.querySelector('[role="dialog"][aria-modal="true"]')))
      ) {
        event.preventDefault();
        setMenu(menu === 'equipment' ? null : 'equipment');
        return;
      }
      if (
        world &&
        !menu &&
        !typing &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        const option =
          event.code === 'KeyF' ? 'autoAttack' : event.code === 'KeyG' ? 'autoTarget' : null;
        if (option) {
          event.preventDefault();
          setPreferences((p) => ({ ...p, [option]: !p[option] }));
        }
      }
      if (
        (event.code === 'F1' || event.key === 'Escape') &&
        !typing &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        ((event.code === 'F1' && menu === 'codex') ||
          (!menu && !document.querySelector('[role="dialog"][aria-modal="true"]')))
      ) {
        event.preventDefault();
        setMenu(event.code === 'F1' ? (menu === 'codex' ? null : 'codex') : 'settings');
        return;
      }
      if (
        event.code === 'KeyE' &&
        !menu &&
        !document.querySelector('[role="dialog"][aria-modal="true"]') &&
        !typing
      )
        interact();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const boss =
    me?.scene === 'forest' && scene?.phase === 'active'
      ? scene.enemies.find((enemy) => enemy.id === scene.bossId && enemy.hitpoints > 0)
      : undefined;
  const departure = Math.max(
    1,
    Math.ceil(((scene?.countdownAt ?? 0) - (world?.serverNow ?? 0)) / 1000),
  );
  const remaining = Math.max(
    0,
    Math.ceil(((scene?.endsAt ?? 0) - (scene?.pausedAt ?? world?.serverNow ?? 0)) / 1000),
  );
  const canRegenerate =
    !!scene &&
    ['active', 'ended'].includes(scene.phase) &&
    !hasLivingScenePlayers(
      world?.players.filter((p) => p.runId === (me?.scene ? me.runId : me?.homeRunId)) ?? [],
    );
  return (
    <main>
      <section className={`stage ${world ? 'in-world' : ''}`} inert={!!menu && menu !== 'talents'}>
        {world && (
          <DeferredContent>
            <Arena
              key={`${playerId}:${retry}`}
              world={status === 'Connected' ? world : null}
              playerId={playerId}
              send={send}
              graphics={graphics}
              preferences={preferences}
              latency={latency}
              interaction={interaction}
              onInteract={interact}
              onCursorAim={setCursorAim}
              onHitpoints={setDisplayedHp}
              onCatSpeech={catSpoke}
            />
            {me && (
              <WeaponActionBar
                send={send}
                onCast={castTalent}
                setPreferences={setPreferences}
                canAutoCast={!unavailable && !menu}
                player={me}
                now={world?.serverNow ?? 0}
                preferences={preferences}
              />
            )}
          </DeferredContent>
        )}
        <GameControls
          hasWorld={!!world}
          canVote={!!scene && ['voting', 'countdown'].includes(scene.phase)}
          unavailable={unavailable}
          browserOpen={browserOpen}
          status={status}
          onMenu={setMenu}
          onOpenBrowser={() => setBrowserOpen(true)}
        />
        {world ? (
          <PartyHud
            world={world}
            worlds={worlds}
            playerId={playerId}
            me={me}
            displayedHp={displayedHp}
          />
        ) : browserOpen ? (
          <WorldBrowser
            steam={steam}
            name={name}
            setName={setName}
            tab={tab}
            setTab={setTab}
            worlds={worlds}
            selected={selected}
            setSelected={setSelected}
            joinPassword={joinPassword}
            setJoinPassword={setJoinPassword}
            unavailable={unavailable}
            latency={latency}
            pending={pending}
            act={act}
            onClose={() => setBrowserOpen(false)}
          />
        ) : null}
        <SceneOverlay
          scene={scene}
          boss={boss}
          me={me}
          remaining={remaining}
          departure={departure}
          playerId={playerId}
          displayedHp={displayedHp}
          deathWindow={deathWindow}
          setDeathWindow={setDeathWindow}
          unavailable={unavailable}
          onReturnLobby={() => send({ type: 'returnLobby' })}
        />
      </section>
      {menu && (
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
          <GameWindow
            key={menu}
            {...gamePanel(menu, building, !!tradingNpcId)}
            onClose={() => setMenu(null)}
          >
            <DeferredContent key={menu}>
              <Stack spacing={2}>
                {menu === 'resetTalents' && me ? (
                  <ResetTalentsPanel
                    me={me}
                    unavailable={unavailable}
                    send={send}
                    onClose={() => setMenu(null)}
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
                      setMenu(null);
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
                    onClose={() => setMenu(null)}
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
                    onClose={() => setMenu(null)}
                  />
                )}
              </Stack>
            </DeferredContent>
          </GameWindow>
        </Box>
      )}
    </main>
  );
}
