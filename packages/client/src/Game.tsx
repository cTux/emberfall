import { gameSceneStatus } from './game-scene-status';
import { useGameInteractions } from './useGameInteractions';
import { GamePanels } from './GamePanels';
import { useGameHotkeys } from './useGameHotkeys';
import { useGamePreferences } from './useGamePreferences';
import { useWorldChat } from './useWorldChat';
import { GameControls } from './GameControls';
import { PartyHud } from './PartyHud';
import { SceneOverlay } from './SceneOverlay';
import type { GameMenu } from './game-panels';
import { WorldBrowser } from './WorldBrowser';
import { useGameSession } from './useGameSession';
import type { AccountView, WorldSummary } from '@emberfall/common';
import { Difficulty } from '@emberfall/common';
import { INNKEEPER } from '@emberfall/core';
import { lazy, useCallback, useEffect, useState } from 'react';
import { DeferredContent } from './DeferredContent';
import type { Preferences } from './preferences';
import type { Dispatch, SetStateAction } from 'react';
import { useChat } from './ChatProvider';

const Arena = lazy(() => {
  return import('./Arena').then((module) => {
    return { default: module.Arena };
  });
});
const WeaponActionBar = lazy(() => {
  return import('./WeaponActionBar').then((module) => {
    return { default: module.WeaponActionBar };
  });
});

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
  const { reportError } = useChat();
  const { status, latency, worlds, world, playerId, pending, retry, send, act } = useGameSession({
    steam,
    refresh,
    reportError,
    onEvent: (event) => {
      if (event === 'voting') {
        setMenu((current) => {
          return current ?? 'portal';
        });

        return;
      }

      setMenu(null);

      if (event === 'joined') {
        clearCatMessages();
        setJoinPassword('');
        setSelected(null);
      }

      if (event === 'sceneChanged') {
        setDeathWindow(true);
      }

      if (event === 'left' || event === 'resumeFailed' || event === 'disconnected') {
        setBrowserOpen(true);
      }

      if (event === 'left' || event === 'disconnected') {
        setTab('browse');
      }

      if (event === 'disconnected') {
        setSelected(null);
        setJoinPassword('');
      }
    },
  });
  const [displayedHp, setDisplayedHp] = useState<Record<string, number>>({});
  const { name, setName, graphics, setGraphics } = useGamePreferences(
    preferences,
    steam,
    account.nickname,
  );
  const [menu, setMenu] = useState<GameMenu | null>(null);
  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Easy);
  const [building, setBuilding] = useState('');
  const [settingsTab, setSettingsTab] = useState('gameplay');
  const [browserOpen, setBrowserOpen] = useState(true);
  const openBrowser = useCallback(() => {
    setBrowserOpen(true);
  }, []);
  const [deathWindow, setDeathWindow] = useState(true);
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
  const me = world?.players.find((p) => {
    return p.id === playerId;
  });
  const scene = world?.scene;
  const { catSpoke, clearCatMessages } = useWorldChat({ world, me, playerId, status, send });
  const { interaction, setCursorAim, castTalent, interact } = useGameInteractions({
    me,
    world,
    unavailable,
    send,
    setMenu,
    setBuilding,
  });
  useGameHotkeys({ world: !!world, menu, setMenu, setPreferences, castTalent, interact });
  const { boss, departure, remaining, canRegenerate } = gameSceneStatus(world, me);

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
          onOpenBrowser={openBrowser}
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
            onClose={() => {
              return setBrowserOpen(false);
            }}
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
          onReturnLobby={() => {
            return send({ type: 'returnLobby' });
          }}
        />
      </section>
      <GamePanels
        menu={menu}
        building={building}
        tradingNpcId={tradingNpcId}
        me={me}
        world={world}
        playerId={playerId}
        unavailable={unavailable}
        send={send}
        act={act}
        account={account}
        rename={rename}
        logout={logout}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        preferences={preferences}
        setPreferences={setPreferences}
        graphics={graphics}
        setGraphics={setGraphics}
        departure={departure}
        canRegenerate={canRegenerate}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        onClose={closeMenu}
      />
    </main>
  );
}
