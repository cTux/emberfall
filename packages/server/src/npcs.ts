import { randomUUID } from 'node:crypto';
import { forestDistance, wrappedDelta } from '@emberfall/core';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import type { Player } from '@emberfall/common';
import { NpcRoutines } from './npc-routines.ts';
import { villagePlayers, type NpcWorld } from './npc-world.ts';
export type { NpcWorld } from './npc-world.ts';
import type { NpcDialogue } from './npc-models.ts';
import { spokenLine } from './npc-models.ts';

const PLAYER_RANGE = 120;
const NPC_RANGE = 160;
const REPLY_DELAY = 2000;
interface Conversation {
  speaker: string;
  playerId?: string;
  otherNpc?: string;
  text?: string;
  /** Number of lines already published in this exchange. */
  lines?: number;
  topic?: string;
}

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
  private memories = new Map<string, string[]>();
  private topics = new Map<string, { remaining: string[]; last?: string }>();
  private reply?: { at: number; conversation: Conversation };
  private continuation?: { at: number; conversation: Conversation };
  private world: NpcWorld;
  private dialogue: NpcDialogue;
  private random: () => number;
  constructor(world: NpcWorld, dialogue: NpcDialogue, now: number, random = Math.random) {
    this.world = world;
    this.dialogue = dialogue;
    this.random = random;
    this.routines = new NpcRoutines(world, now, random);
    this.nextTalk = now + 10_000;
    this.lastTick = now;
  }
  close() {
    this.stopped = true;
    this.abort.abort();
    this.routines.close();
    this.reply = this.continuation = undefined;
  }
  interact(player: Player, npcId: string | null) {
    if (this.stopped) return;
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
    )
      return;
    for (const name of text.toLowerCase().match(/[\p{L}\p{M}\p{N}_]+/gu) ?? []) {
      const npc = this.world.npcs?.find(
        (n) =>
          n.name.split(' ')[0].toLowerCase() === name && forestDistance(n, player) <= PLAYER_RANGE,
      );
      if (!npc) continue;
      npc.workstationId = npc.workStartedAt = undefined;
      npc.moving = false;
      this.nextReply = now + 5000;
      this.reply = {
        at: now + REPLY_DELAY,
        conversation: { speaker: npc.id, playerId: player.id, text },
      };
      this.replyAt.set(player.id, now + 10_000);
      return;
    }
  }
  tick(now: number, dt: number) {
    this.lastTick = now;
    if (this.stopped) return;
    const players = villagePlayers(this.world);
    const npcs = this.world.npcs ?? [];
    const liveIds = new Set(this.world.players.keys());
    for (const map of [this.playerAt, this.replyAt])
      for (const id of map.keys()) if (!liveIds.has(id)) map.delete(id);
    const blocked = new Set<string>();
    for (const conversation of [
      this.inFlight ? this.activeConversation : undefined,
      this.continuation?.conversation,
    ]) {
      if (!conversation) continue;
      blocked.add(conversation.speaker);
      if (conversation.otherNpc) blocked.add(conversation.otherNpc);
    }
    if (this.reply) blocked.add(this.reply.conversation.speaker);
    this.routines.tick(now, dt, players, blocked);
    if (!players.length || this.inFlight || now < this.retryAt) return;
    if (this.reply) {
      if (now < this.reply.at) return;
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
    if (this.continuation) return;
    if (now < this.nextTalk) return;
    for (const npc of npcs) {
      if (!npc.silenced && now < (this.npcAt.get(npc.id) ?? 0)) continue;
      const player = players.find(
        (p) =>
          forestDistance(npc, p) <= PLAYER_RANGE &&
          (npc.silenced || now >= (this.playerAt.get(p.id) ?? 0)),
      );
      if (player) {
        this.start({ speaker: npc.id, playerId: player.id }, now);
        return;
      }
      const other = npcs.find(
        (n) =>
          n.id !== npc.id &&
          forestDistance(npc, n) <= NPC_RANGE &&
          (npc.silenced || now >= (this.npcAt.get(n.id) ?? 0)),
      );
      if (other) {
        this.start({ speaker: npc.id, otherNpc: other.id }, now);
        return;
      }
    }
  }
  private activeConversation?: Conversation;
  private chooseTopic(npcId: string) {
    let rotation = this.topics.get(npcId);
    if (!rotation) {
      rotation = { remaining: [] };
      this.topics.set(npcId, rotation);
    }
    if (!rotation.remaining.length) rotation.remaining = [...VILLAGE_DEFINITION.dialogueTopics];
    let index = Math.floor(this.random() * rotation.remaining.length);
    if (rotation.remaining[index] === rotation.last && rotation.remaining.length > 1)
      index = (index + 1) % rotation.remaining.length;
    const [topic] = rotation.remaining.splice(index, 1);
    rotation.last = topic;
    return topic;
  }
  private participants(conversation: Conversation) {
    const npc = this.world.npcs?.find((n) => n.id === conversation.speaker);
    const target = conversation.playerId
      ? this.world.players.get(conversation.playerId)
      : this.world.npcs?.find((n) => n.id === conversation.otherNpc);
    if (
      !npc ||
      !target ||
      (conversation.playerId &&
        !villagePlayers(this.world).some((p) => p.id === conversation.playerId)) ||
      forestDistance(npc, target) > (conversation.playerId ? PLAYER_RANGE : NPC_RANGE)
    )
      return undefined;
    return { npc, target };
  }
  private start(conversation: Conversation, now: number) {
    const actors = this.participants(conversation);
    if (!actors) return;
    actors.npc.moving = false;
    actors.npc.workstationId = actors.npc.workStartedAt = undefined;
    actors.npc.angle = Math.atan2(
      wrappedDelta(actors.target.y, actors.npc.y, VILLAGE_DEFINITION.geometry.height),
      wrappedDelta(actors.target.x, actors.npc.x, VILLAGE_DEFINITION.geometry.width),
    );
    if (conversation.otherNpc) {
      const other = this.world.npcs!.find((n) => n.id === conversation.otherNpc)!;
      other.moving = false;
      other.workstationId = other.workStartedAt = undefined;
      other.angle = actors.npc.angle + Math.PI;
    }
    this.inFlight = true;
    this.activeConversation = conversation;
    if (!conversation.text) {
      this.nextTalk = now + 90_000;
      this.npcAt.set(actors.npc.id, now + 180_000);
      if (conversation.otherNpc) this.npcAt.set(conversation.otherNpc, now + 180_000);
    }
    if (conversation.playerId && !conversation.text)
      this.playerAt.set(conversation.playerId, now + 240_000);
    const definition = VILLAGE_DEFINITION.villagers.find((n) => n.id === actors.npc.id)!;
    if (!conversation.text) conversation.topic = this.chooseTopic(actors.npc.id);
    const context = JSON.stringify({
      character: definition.name,
      personality: definition.personality,
      background: definition.background,
      setting:
        'Emberfall is a cooperative medieval fantasy game. Adventurers prepare in the village, fight monsters and a Brute Boss in the forest, and return with loot. Marta sells consumables and resources; Bram sells gear. Both buy collected items and offer buyback. The Storehouse stores items. The Inn is scenery; Hall and Lodge have no services yet. Do not invent active festivals, quests or services.',
      residents: VILLAGE_DEFINITION.villagers.map(
        (npc) => `@${npc.name.split(' ')[0]}: ${npc.name}`,
      ),
      listener: actors.target.name,
      listenerMention: conversation.otherNpc ? `@${actors.target.name.split(' ')[0]}` : undefined,
      task: conversation.text
        ? 'Reply to the quoted speech, drawing on your background when relevant.'
        : 'Start a friendly conversation about the selected topic with a personal detail or a question.',
      topic: conversation.topic,
      quotedSpeech: conversation.text,
      recentConversation: this.memories.get(actors.npc.id) ?? [],
    });
    void this.dialogue
      .generate(context, this.abort.signal)
      .then((result) => {
        if (this.stopped || !villagePlayers(this.world).length) return;
        // Completion uses the current simulation time, not request-start time.
        const at = this.lastTick;
        if (result.status === 'busy') {
          if (conversation.text) {
            this.continuation = { at: at + 500, conversation };
            return;
          }
          this.nextTalk = at + 5000;
          this.npcAt.set(actors.npc.id, at + 5000);
          if (conversation.otherNpc) this.npcAt.set(conversation.otherNpc, at + 5000);
          if (conversation.playerId && !conversation.text)
            this.playerAt.set(conversation.playerId, at + 5000);
          return;
        }
        if (result.status === 'unavailable') {
          this.silence(true);
          this.retryAt = at + 60_000;
          this.nextTalk = this.retryAt;
          this.continuation = undefined;
          return;
        }
        this.silence(false);
        const current = this.participants(conversation);
        if (!current) return;
        let text = result.text;
        for (const resident of VILLAGE_DEFINITION.villagers) {
          const name = resident.name.split(' ')[0];
          text = text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])@?${name}\\b`, 'giu'), `@${name}`);
        }
        text = spokenLine(text);
        current.npc.chat = text;
        current.npc.chatUntil = at + 10_000;
        this.world.chat = [
          ...(this.world.chat ?? []),
          {
            id: randomUUID(),
            playerId: '',
            npcId: current.npc.id,
            name: current.npc.name,
            text,
            dimension: 'village',
          },
        ].slice(-30);
        const mentioned = [...text.matchAll(/@([\p{L}]+)/gu)]
          .map((match) => this.world.npcs?.find((npc) => npc.name.split(' ')[0] === match[1]))
          .find((npc) => npc && npc.id !== current.npc.id);
        const line = `${current.npc.name}: ${text}`;
        for (const id of new Set(
          [current.npc.id, conversation.otherNpc, mentioned?.id].filter((id): id is string => !!id),
        ))
          this.memories.set(id, [...(this.memories.get(id) ?? []), line].slice(-6));
        const lines = (conversation.lines ?? 0) + 1;
        const responder = mentioned?.id ?? (!conversation.text ? conversation.otherNpc : undefined);
        if (responder && lines < 5)
          this.continuation = {
            at: at + REPLY_DELAY,
            conversation: {
              speaker: responder,
              otherNpc: current.npc.id,
              text,
              lines,
              topic: conversation.topic,
            },
          };
      })
      .catch(() => {
        if (!this.stopped && villagePlayers(this.world).length) {
          this.silence(true);
          this.retryAt = this.lastTick + 60_000;
          this.nextTalk = this.retryAt;
        }
      })
      .finally(() => {
        this.inFlight = false;
        this.activeConversation = undefined;
      });
  }
  private lastTick = 0;
  private silence(value: boolean) {
    const npcs = this.world.npcs ?? [];
    if (npcs.every((npc) => npc.silenced === value)) return;
    for (const npc of npcs) {
      npc.silenced = value;
      if (value) npc.chat = undefined;
    }
    this.world.chat = [
      ...(this.world.chat ?? []),
      {
        id: randomUUID(),
        playerId: '',
        name: 'System',
        dimension: 'village',
        tone: value ? ('danger' as const) : ('success' as const),
        text: value
          ? 'The villagers have been silenced. Their voices will return soon.'
          : 'The villagers’ voices have returned.',
      },
    ].slice(-30);
  }
}
