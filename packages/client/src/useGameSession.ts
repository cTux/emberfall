import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, WorldState, WorldSummary } from '@emberfall/common';
import { GameConnection } from './connection';
import { clientAsset, websocketUrl } from './urls';

export type SessionEvent =
  | 'joined'
  | 'voting'
  | 'sceneChanged'
  | 'left'
  | 'resumeFailed'
  | 'disconnected';
export function useGameSession({
  steam,
  refresh,
  reportError,
  onEvent,
}: {
  steam: boolean;
  refresh: () => Promise<void>;
  reportError: (message: string) => void;
  onEvent: (event: SessionEvent) => void;
}) {
  const events = useRef(onEvent);
  useEffect(() => {
    events.current = onEvent;
  }, [onEvent]);
  const socket = useRef<GameConnection | null>(null);
  const [status, setStatus] = useState('Connecting');
  const [latency, setLatency] = useState<number | null>(null);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [world, setWorld] = useState<WorldState | null>(null);
  const [playerId, setPlayerId] = useState('');
  const previousWorld = useRef<string | null>(null);
  const characterToken = useRef<string | undefined>(undefined);
  useEffect(() => {
    try {
      if (!steam)
        characterToken.current = localStorage.getItem('emberfall-new.character') ?? undefined;
      previousWorld.current = sessionStorage.getItem('emberfall-new.world');
    } catch {
      /* Keep the key in memory for this session. */
    }
  }, [steam]);
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const rememberWorld = (id: string | null) => {
    previousWorld.current = id;
    try {
      if (id) sessionStorage.setItem('emberfall-new.world', id);
      else sessionStorage.removeItem('emberfall-new.world');
    } catch {
      /* Recovery within this page still works when storage is unavailable. */
    }
  };

  const failedConnections = useRef(0);
  useEffect(() => {
    const url = websocketUrl();
    setStatus(previousWorld.current ? 'Reconnecting' : 'Connecting');
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const versionRequest = new AbortController();
    let disposed = false;
    let resuming = false;
    const ws = new GameConnection(url, steam);
    socket.current = ws;
    let joinedId = '';
    let previousScene: string | undefined;
    let voteScene: string | undefined;
    let probeId = 0;
    let pendingProbe: { id: number; at: number } | null = null;
    const ping = () => {
      if (ws.readyState !== GameConnection.OPEN) return;
      const now = performance.now();
      if (pendingProbe && now - pendingProbe.at < 5000) return;
      if (pendingProbe) setLatency(null);
      pendingProbe = { id: ++probeId, at: now };
      ws.send({ type: 'ping', id: probeId });
    };

    const pingTimer = setInterval(ping, 2000);
    // The version request catches failures and closes the connection for retry.
    // oxlint-disable-next-line typescript/no-misused-promises
    ws.onopen = async () => {
      try {
        const response = await fetch(clientAsset('/version.json'), {
          cache: 'no-store',
          signal: AbortSignal.any([versionRequest.signal, AbortSignal.timeout(3000)]),
        });
        if (!response.ok) throw new Error('Version check unavailable');
        const { buildId } = await response.json();
        if (typeof buildId !== 'string' || !buildId) throw new Error('Invalid build ID');
        if (disposed || ws.readyState !== GameConnection.OPEN) return;
        if (buildId !== __BUILD_ID__) {
          setStatus('Updating');
          location.reload();

          return;
        }
      } catch {
        if (!disposed && ws.readyState === GameConnection.OPEN)
          ws.close(3001, 'Retry version check');

        return;
      }

      if (disposed || ws.readyState !== GameConnection.OPEN) return;
      failedConnections.current = 0;

      resuming = !!previousWorld.current && (steam || !!characterToken.current);
      if (resuming) {
        setPending(true);
        ws.send({
          type: 'resume',
          worldId: previousWorld.current!,
          characterToken: steam ? '0'.repeat(64) : characterToken.current!,
        });
      } else setStatus('Connected');
      ping();
    };

    ws.onmessage = (event) => {
      const message = event.data;
      if (message.type === 'pong' && pendingProbe?.id === message.id) {
        setLatency(Math.max(0, Math.round(performance.now() - pendingProbe.at)));
        pendingProbe = null;
      }

      if (message.type === 'worlds') setWorlds(message.worlds);
      if (message.type === 'joined') {
        rememberWorld(message.world.id);
        resuming = false;
        setStatus('Connected');
        events.current('joined');
        joinedId = message.playerId;
        previousScene = undefined;
        characterToken.current = message.characterToken;
        try {
          if (!steam) localStorage.setItem('emberfall-new.character', message.characterToken);
        } catch {
          reportError(
            'Your browser cannot remember this character key. Enable site storage to restore progress next session.',
          );
        }

        setWorld(message.world);
        setPlayerId(message.playerId);
        setPending(false);
      }

      if (message.type === 'state') {
        if (message.world.scene?.phase === 'voting' && voteScene !== message.world.scene.id)
          events.current('voting');
        voteScene = message.world.scene?.id;
        const nextScene = message.world.players.find((p) => p.id === joinedId)?.scene;
        if (nextScene !== previousScene) {
          events.current('sceneChanged');
        }

        previousScene = nextScene;
        setWorld(message.world);
      }

      if (message.type === 'left') {
        rememberWorld(null);
        events.current('left');
        setWorld(null);
        setPlayerId('');
        setPending(false);
      }

      if (message.type === 'error') {
        if (resuming) {
          resuming = false;
          rememberWorld(null);
          setStatus('Connected');
          setWorld(null);
          setPlayerId('');
          events.current('resumeFailed');
        }

        reportError(message.message);
        setPending(false);
      }
    };

    ws.onclose = () => {
      if (steam) void refresh();
      clearInterval(pingTimer);
      setLatency(null);
      setStatus('Reconnecting');
      setWorld(null);
      setPlayerId('');
      events.current('disconnected');
      setWorlds([]);
      setPending(false);
      reportError('Connection lost. Reconnecting automatically…');
      reconnectTimer = setTimeout(
        () => setRetry((value) => value + 1),
        failedConnections.current++ === 0 ? 0 : 1000,
      );
    };

    ws.onerror = () => reportError('Cannot reach the world server. Retrying automatically…');

    return () => {
      disposed = true;
      versionRequest.abort();
      clearInterval(pingTimer);
      clearTimeout(reconnectTimer);
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      ws.close();
    };
  }, [retry, steam, refresh, reportError]);
  const send = useCallback(
    (message: ClientMessage) => {
      if (status === 'Connected' && socket.current?.readyState === GameConnection.OPEN)
        socket.current.send(message);
    },
    [status],
  );
  const act = (message: ClientMessage) => {
    if (status !== 'Connected') return;

    setPending(true);
    send(
      message.type === 'create' || message.type === 'join'
        ? { ...message, characterToken: characterToken.current }
        : message,
    );
  };

  return { status, latency, worlds, world, playerId, pending, retry, send, act };
}
