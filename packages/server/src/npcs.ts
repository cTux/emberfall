import { NPC_TIMING } from './npc-timing.ts';
import {
  conversationParticipants,
  faceConversation,
  conversationBlocks,
} from './npc-participants.ts';
import { forestDistance } from '@emberfall/core';
import type { Player } from '@emberfall/common';
import { NpcRoutines } from './npc-routines.ts';
import { villagePlayers, type NpcWorld } from './npc-world.ts';
export type { NpcWorld } from './npc-world.ts';
import type { NpcDialogue } from './npc-models.ts';
import { NpcSpeech, type Conversation } from './npc-speech.ts';

/** One scheduler per world; LLM work never blocks the fixed simulation tick. */
export class VillageLife {
  private stopped = false;
  private abort = new AbortController();
  private inFlight = false;
  private nextTalk = 0;
  private nextReply = 0;
  private retryAt = 0;
  private npcAt = new Map<string, number>();
  private replyAt = new Map<string, number>();
  private playerAt = new Map<string, number>();
  private routines: NpcRoutines;
  private speech: NpcSpeech;
  private reply?: { at: number; conversation: Conversation };
  private continuation?: { at: number; conversation: Conversation };
  private world: NpcWorld;
  private dialogue: NpcDialogue;

  constructor(world: NpcWorld, dialogue: NpcDialogue, now: number, random = Math.random) {
    this.world = world;
    this.dialogue = dialogue;
    this.speech = new NpcSpeech(world, random);
    this.routines = new NpcRoutines(world, now, random);
    this.nextTalk = now + NPC_TIMING.initialTalkDelayMs;
    this.lastTick = now;
  }

  close() {
    this.stopped = true;
    this.abort.abort();
    this.routines.close();
    this.reply = this.continuation = undefined;
  }

  interact(player: Player, npcId: string | null) {
    if (this.stopped) {
      return;
    }

    this.routines.interact(player, npcId);
  }

  hear(player: Player, text: string, now: number) {
    if (
      this.stopped ||
      now < this.nextReply ||
      player.scene ||
      player.hitpoints <= 0 ||
      player.reconnecting ||
      this.reply ||
      (this.activeConversation?.playerId && this.activeConversation.text) ||
      (this.continuation?.conversation.playerId && this.continuation.conversation.text) ||
      now < (this.replyAt.get(player.id) ?? 0)
    ) {
      return;
    }

    for (const name of text.toLowerCase().match(/[\p{L}\p{M}\p{N}_]+/gu) ?? []) {
      const npc = this.world.npcs?.find((n) => {
        return (
          n.name.split(' ')[0].toLowerCase() === name &&
          forestDistance(n, player) <= NPC_TIMING.playerRange
        );
      });

      if (!npc) {
        continue;
      }

      npc.workstationId = npc.workStartedAt = undefined;
      npc.moving = false;
      this.nextReply = now + NPC_TIMING.exchangeCooldownMs;
      this.reply = {
        at: now + NPC_TIMING.replyDelayMs,
        conversation: { speaker: npc.id, playerId: player.id, text },
      };
      this.replyAt.set(player.id, now + NPC_TIMING.playerReplyCooldownMs);

      return;
    }
  }

  tick(now: number, dt: number) {
    this.lastTick = now;

    if (this.stopped) {
      return;
    }

    const players = villagePlayers(this.world);
    const npcs = this.world.npcs ?? [];
    const liveIds = new Set(this.world.players.keys());

    for (const map of [this.playerAt, this.replyAt]) {
      for (const id of map.keys()) {
        if (!liveIds.has(id)) {
          map.delete(id);
        }
      }
    }

    const blocked = conversationBlocks([
      this.inFlight ? this.activeConversation : undefined,
      this.continuation?.conversation,
      this.reply?.conversation,
    ]);

    this.routines.tick(now, dt, players, blocked);

    if (!players.length || this.inFlight || now < this.retryAt) {
      return;
    }

    if (this.reply) {
      if (now < this.reply.at) {
        return;
      }

      const { conversation } = this.reply;
      this.reply = undefined;
      // A player's question supersedes ambient banter, including a continuation
      // produced by the request that was in flight when the question arrived.
      this.continuation = undefined;
      this.start(conversation, now);

      return;
    }

    if (this.continuation && now >= this.continuation.at) {
      const { conversation } = this.continuation;
      this.continuation = undefined;
      this.start(conversation, now);

      return;
    }

    if (this.continuation) {
      return;
    }

    if (now < this.nextTalk) {
      return;
    }

    for (const npc of npcs) {
      if (!npc.silenced && now < (this.npcAt.get(npc.id) ?? 0)) {
        continue;
      }

      const player = players.find((p) => {
        return (
          forestDistance(npc, p) <= NPC_TIMING.playerRange &&
          (npc.silenced || now >= (this.playerAt.get(p.id) ?? 0))
        );
      });

      if (player) {
        this.start({ speaker: npc.id, playerId: player.id }, now);

        return;
      }

      const other = npcs.find((n) => {
        return (
          n.id !== npc.id &&
          forestDistance(npc, n) <= NPC_TIMING.npcRange &&
          (npc.silenced || now >= (this.npcAt.get(n.id) ?? 0))
        );
      });

      if (other) {
        this.start({ speaker: npc.id, otherNpc: other.id }, now);

        return;
      }
    }
  }

  private activeConversation?: Conversation;

  private start(conversation: Conversation, now: number) {
    const actors = conversationParticipants(this.world, conversation);

    if (!actors) {
      return;
    }

    faceConversation(this.world, conversation, actors);

    this.inFlight = true;
    this.activeConversation = conversation;

    if (!conversation.text) {
      this.nextTalk = now + NPC_TIMING.ambientCooldownMs;
      this.npcAt.set(actors.npc.id, now + NPC_TIMING.npcAmbientCooldownMs);

      if (conversation.otherNpc) {
        this.npcAt.set(conversation.otherNpc, now + NPC_TIMING.npcAmbientCooldownMs);
      }
    }

    if (conversation.playerId && !conversation.text) {
      this.playerAt.set(conversation.playerId, now + NPC_TIMING.playerAmbientCooldownMs);
    }

    const context = this.speech.context(conversation, actors.npc, actors.target);
    void this.dialogue
      .generate(context, this.abort.signal)
      .then((result) => {
        if (this.stopped || !villagePlayers(this.world).length) {
          return;
        }

        // Completion uses the current simulation time, not request-start time.
        const at = this.lastTick;

        if (result.status === 'busy') {
          if (conversation.text) {
            this.continuation = { at: at + NPC_TIMING.continuationDelayMs, conversation };

            return;
          }

          this.nextTalk = at + NPC_TIMING.exchangeCooldownMs;
          this.npcAt.set(actors.npc.id, at + NPC_TIMING.exchangeCooldownMs);

          if (conversation.otherNpc) {
            this.npcAt.set(conversation.otherNpc, at + NPC_TIMING.exchangeCooldownMs);
          }

          if (conversation.playerId && !conversation.text) {
            this.playerAt.set(conversation.playerId, at + NPC_TIMING.exchangeCooldownMs);
          }

          return;
        }

        if (result.status === 'unavailable') {
          this.speech.silence(true);
          this.retryAt = at + NPC_TIMING.failureRetryMs;
          this.nextTalk = this.retryAt;
          this.continuation = undefined;

          return;
        }

        this.speech.silence(false);
        const current = conversationParticipants(this.world, conversation);

        if (!current) {
          return;
        }

        const { text, mentioned } = this.speech.publish(conversation, current.npc, result.text, at);
        const lines = (conversation.lines ?? 0) + 1;
        const responder = mentioned?.id ?? (!conversation.text ? conversation.otherNpc : undefined);

        if (responder && lines < NPC_TIMING.maxExchangeLines) {
          this.continuation = {
            at: at + NPC_TIMING.replyDelayMs,
            conversation: {
              speaker: responder,
              otherNpc: current.npc.id,
              text,
              lines,
              topic: conversation.topic,
            },
          };
        }
      })
      .catch(() => {
        if (!this.stopped && villagePlayers(this.world).length) {
          this.speech.silence(true);
          this.retryAt = this.lastTick + NPC_TIMING.failureRetryMs;
          this.nextTalk = this.retryAt;
        }
      })
      .finally(() => {
        this.inFlight = false;
        this.activeConversation = undefined;
      });
  }

  private lastTick = 0;
}
