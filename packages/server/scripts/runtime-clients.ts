import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Client, type Room } from '@colyseus/sdk';
import type { ClientMessage, ServerMessage, WorldState } from '@emberfall/common';
import { SessionState, materializeState } from '@emberfall/common/protocol';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { BENCHMARK } from './runtime-workload.ts';

export async function connectWorkload(port: number, worldCount: number) {
  const peers: {
    room: Room<SessionState>;
    playerId: string;
    worldId: string;
    latest?: WorldState;
    receivedAt: number;
    states: number;
    saved: number;
    lastServerNow: number;
    lastAck: number;
    sent: Map<number, number>;
  }[] = [];
  const errors: string[] = [];
  const gaps: number[] = [];
  const acknowledgements: number[] = [];
  let measuring = false;
  let closing = false;
  let sequence = 0;
  let scenes: Record<string, string> = {};
  let input: ReturnType<typeof setInterval> | undefined;
  const close = async () => {
    closing = true;
    clearInterval(input);
    await Promise.allSettled(
      peers.filter((peer) => peer.room.connection.isOpen).map((peer) => peer.room.leave(false)),
    );
  };

  try {
    for (let world = 0; world < worldCount; world++) {
      let worldId = '';
      for (let player = 0; player < BENCHMARK.playersPerWorld; player++) {
        const room = await new Client(`http://127.0.0.1:${port}`).create<SessionState>(
          'session',
          { protocolVersion: RUNTIME.protocolVersion },
          SessionState,
        );
        room.reconnection.enabled = false;
        const peer: (typeof peers)[number] = {
          room,
          playerId: '',
          worldId: '',
          receivedAt: 0,
          states: 0,
          saved: 0,
          lastServerNow: 0,
          lastAck: 0,
          sent: new Map(),
        };
        peers.push(peer);
        room.onError((code, message) => errors.push(`${code}: ${message}`));
        room.onLeave((code) => {
          if (!closing) errors.push(`Unexpected disconnect: ${code}`);
        });
        let joined: ((message: Extract<ServerMessage, { type: 'joined' }>) => void) | undefined;
        room.onMessage('event', (message: ServerMessage) => {
          if (message.type === 'joined') joined?.(message);
          if (message.type === 'error') errors.push(message.message);
          if (measuring && message.type === 'saved') peer.saved++;
        });
        room.onStateChange((state) => {
          try {
            const view = materializeState(state);
            if (!view) return;
            peer.latest = view;
            peer.receivedAt = performance.now();
            if (!measuring) return;
            assert.equal(view.id, peer.worldId);
            assert.equal(view.scene?.id, scenes[peer.worldId]);
            assert.equal(view.players.length, BENCHMARK.playersPerWorld);
            assert(
              view.players.every((actor) =>
                peers.some((p) => p.worldId === view.id && p.playerId === actor.id),
              ),
            );
            const privateLines = view.chat?.filter((line) =>
              line.text.startsWith('benchmark-private:'),
            );
            assert.deepEqual(
              privateLines?.map((line) => line.text),
              [`benchmark-private:${peer.playerId}`],
            );
            if (peer.lastServerNow) gaps.push(view.serverNow! - peer.lastServerNow);
            peer.lastServerNow = view.serverNow!;
            peer.states++;
            const ack = view.players.find((actor) => actor.id === peer.playerId)!.inputSeq ?? 0;
            if (ack > peer.lastAck) {
              const sent = peer.sent.get(ack);
              if (sent !== undefined) acknowledgements.push(performance.now() - sent);
              for (const seq of peer.sent.keys()) if (seq <= ack) peer.sent.delete(seq);
              peer.lastAck = ack;
            }
          } catch (error) {
            if (errors.length < 20) errors.push(String(error));
          }
        });
        const admission = new Promise<Extract<ServerMessage, { type: 'joined' }>>(
          (resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error('Benchmark admission timed out')),
              15000,
            );
            joined = (message) => {
              clearTimeout(timer);
              resolve(message);
            };
          },
        );
        const command: ClientMessage =
          player === 0
            ? {
                type: 'create',
                name: `Benchmark ${world}`,
                playerName: `Bench ${world}-${player}`,
                password: '',
              }
            : { type: 'join', worldId, playerName: `Bench ${world}-${player}`, password: '' };
        room.send('command', command);
        const message = await admission;
        peer.playerId = message.playerId;
        peer.worldId = worldId = message.world.id;
      }
    }
  } catch (error) {
    await close();

    throw error;
  }

  return {
    startInputs(epochs: Record<string, string>) {
      scenes = epochs;
      input = setInterval(() => {
        sequence++;
        for (const [index, peer] of peers.entries()) {
          if (measuring) peer.sent.set(sequence, performance.now());
          peer.room.send('command', {
            type: 'move',
            seq: sequence,
            epoch: scenes[peer.worldId],
            durationMs: BENCHMARK.inputMs,
            x: Math.sin(sequence / 20 + index),
            y: Math.cos(sequence / 20 + index),
          } satisfies ClientMessage);
        }
      }, BENCHMARK.inputMs);
    },
    begin() {
      gaps.length = acknowledgements.length = 0;
      for (const peer of peers) {
        peer.states = peer.saved = peer.lastServerNow = peer.lastAck = 0;
        peer.sent.clear();
      }

      measuring = true;
    },
    finish(measuredMs: number) {
      measuring = false;
      clearInterval(input);
      assert.deepEqual(errors, []);
      for (const peer of peers) {
        assert(peer.states > 0 && peer.lastAck > 0);
        assert(peer.saved >= 5, 'Measure multiple real autosave cycles per player');
        assert(performance.now() - peer.receivedAt < 1000, 'Every client must remain live');
      }

      assert(gaps.length && acknowledgements.length);
      const p95 = (values: number[]) =>
        [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];

      return {
        connections: peers.length,
        meanStateHz:
          peers.reduce((sum, peer) => sum + peer.states, 0) / peers.length / (measuredMs / 1000),
        minStateHz: Math.min(...peers.map((peer) => peer.states)) / (measuredMs / 1000),
        serverNowGapP95Ms: p95(gaps),
        serverNowGapMaxMs: Math.max(...gaps),
        inputAcknowledgementP95Ms: p95(acknowledgements),
        minSavedEvents: Math.min(...peers.map((peer) => peer.saved)),
        savedEvents: peers.reduce((sum, peer) => sum + peer.saved, 0),
        privacyChecks: peers.reduce((sum, peer) => sum + peer.states, 0),
        errors: errors.length,
      };
    },
    close,
  };
}
