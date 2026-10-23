import { randomUUID } from 'node:crypto';
import { forestDistance, nearbyInteraction, wrap, wrappedDelta } from '@emberfall/core';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import type { ChatMessage, Player, VillageNpc } from '@emberfall/common';
import { simulationFor } from './ecs/simulation.ts';
import type { NpcDialogue } from './npc-models.ts';

export interface NpcWorld {
  players: Map<string, Player>;
  npcs?: VillageNpc[];
  chat?: ChatMessage[];
}
const PLAYER_RANGE = 120;
const NPC_RANGE = 160;
const SPEED = 38;
const villagePlayers = (world: NpcWorld) =>
  [...world.players.values()].filter((p) => !p.scene && p.hitpoints > 0 && !p.reconnecting);
interface Conversation {
  speaker: string;
  playerId?: string;
  otherNpc?: string;
  text?: string;
  followup?: boolean;
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
  private walks = new Map<string, { stop: number; pauseUntil: number }>();
  private interactions = new Map<string, string>();
  private memories = new Map<string, string[]>();
  private reply?: Conversation;
  private continuation?: { at: number; conversation: Conversation };
  private world: NpcWorld;
  private dialogue: NpcDialogue;
  private random: () => number;
  constructor(world: NpcWorld, dialogue: NpcDialogue, now: number, random = Math.random) {
    this.world = world;
    this.dialogue = dialogue;
    this.random = random;
    world.npcs = VILLAGE_DEFINITION.villagers.map((definition) => {
      this.walks.set(definition.id, {
        stop: this.chooseStop(),
        pauseUntil: now + 5000 + this.random() * 4000,
      });
      return {
        id: definition.id,
        name: definition.name,
        buildingId: definition.buildingId,
        x: definition.x,
        y: definition.y,
        angle: Math.PI / 2,
        moving: false,
        silenced: false,
      };
    });
    world.npcs = simulationFor(world.players)?.setVillagers(world.npcs) ?? world.npcs;
    this.nextTalk = now + 10_000;
    this.lastTick = now;
  }
  private chooseStop(previous = -1) {
    const stops = VILLAGE_DEFINITION.npcStops
      .map((_, index) => index)
      .filter((index) => index !== previous);
    const claimed = new Set([...this.walks.values()].map((walk) => walk.stop));
    const free = stops.filter((index) => !claimed.has(index));
    const candidates = free.length ? free : stops;
    return candidates[Math.floor(this.random() * candidates.length)];
  }
  close() {
    this.stopped = true;
    this.abort.abort();
    simulationFor(this.world.players)?.setVillagers([]);
    this.reply = this.continuation = undefined;
    this.interactions.clear();
  }
  interact(player: Player, npcId: string | null) {
    this.interactions.delete(player.id);
    if (
      this.stopped ||
      !npcId ||
      !villagePlayers(this.world).includes(player) ||
      !this.world.npcs?.some((npc) => npc.id === npcId) ||
      nearbyInteraction(player, false, undefined, this.world.npcs)?.id !== npcId
    )
      return;
    this.interactions.set(player.id, npcId);
    this.world.npcs.find((npc) => npc.id === npcId)!.moving = false;
  }
  hear(player: Player, text: string, now: number) {
    if (
      this.stopped ||
      now < this.nextReply ||
      player.scene ||
      player.hitpoints <= 0 ||
      player.reconnecting ||
      this.inFlight ||
      this.reply ||
      this.continuation ||
      now < (this.replyAt.get(player.id) ?? 0)
    )
      return;
    const named = text.match(/^@([^\s]+)\s+(.+)$/u);
    if (!named) return;
    const npc = this.world.npcs?.find(
      (n) => n.name.split(' ')[0].toLowerCase() === named[1].toLowerCase(),
    );
    if (!npc || forestDistance(npc, player) > PLAYER_RANGE) return;
    this.nextReply = now + 5000;
    this.reply = { speaker: npc.id, playerId: player.id, text: named[2] };
    this.replyAt.set(player.id, now + 10_000);
  }
  tick(now: number, dt: number) {
    this.lastTick = now;
    if (this.stopped) return;
    const players = villagePlayers(this.world);
    const npcs = this.world.npcs ?? [];
    for (const [playerId, npcId] of this.interactions) {
      const player = players.find((p) => p.id === playerId);
      if (!player || nearbyInteraction(player, false, undefined, npcs)?.id !== npcId)
        this.interactions.delete(playerId);
    }
    const interacting = new Set(this.interactions.values());
    const liveIds = new Set(this.world.players.keys());
    for (const map of [this.playerAt, this.replyAt])
      for (const id of map.keys()) if (!liveIds.has(id)) map.delete(id);
    for (const npc of npcs) {
      if ((npc.chatUntil ?? 0) < now) npc.chat = undefined;
      const walk = this.walks.get(npc.id)!;
      const occupied =
        this.inFlight &&
        (this.activeConversation?.speaker === npc.id ||
          this.activeConversation?.otherNpc === npc.id);
      const continuing =
        this.continuation &&
        (this.continuation.conversation.speaker === npc.id ||
          this.continuation.conversation.otherNpc === npc.id);
      if (
        !players.length ||
        occupied ||
        continuing ||
        now < walk.pauseUntil ||
        interacting.has(npc.id)
      ) {
        npc.moving = false;
        continue;
      }
      const target = VILLAGE_DEFINITION.npcStops[walk.stop % VILLAGE_DEFINITION.npcStops.length];
      const dx = wrappedDelta(target.x, npc.x, VILLAGE_DEFINITION.geometry.width),
        dy = wrappedDelta(target.y, npc.y, VILLAGE_DEFINITION.geometry.height);
      const distance = Math.hypot(dx, dy);
      const step = Math.min(distance, SPEED * dt);
      if (distance < 1) {
        walk.stop = this.chooseStop(walk.stop);
        walk.pauseUntil = now + 5000 + this.random() * 4000;
        npc.moving = false;
      } else {
        npc.angle = Math.atan2(dy, dx);
        npc.x = wrap(npc.x + (dx / distance) * step, VILLAGE_DEFINITION.geometry.width);
        npc.y = wrap(npc.y + (dy / distance) * step, VILLAGE_DEFINITION.geometry.height);
        npc.moving = true;
      }
    }
    if (!players.length || this.inFlight || now < this.retryAt) return;
    if (this.continuation && now >= this.continuation.at) {
      const { conversation } = this.continuation;
      this.continuation = undefined;
      this.start(conversation, now);
      return;
    }
    if (this.continuation) return;
    if (this.reply) {
      const reply = this.reply;
      this.reply = undefined;
      this.start(reply, now);
      return;
    }
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
    actors.npc.angle = Math.atan2(
      wrappedDelta(actors.target.y, actors.npc.y, VILLAGE_DEFINITION.geometry.height),
      wrappedDelta(actors.target.x, actors.npc.x, VILLAGE_DEFINITION.geometry.width),
    );
    if (conversation.otherNpc) {
      const other = this.world.npcs!.find((n) => n.id === conversation.otherNpc)!;
      other.moving = false;
      other.angle = actors.npc.angle + Math.PI;
    }
    this.inFlight = true;
    this.activeConversation = conversation;
    this.nextTalk = now + 45_000;
    this.npcAt.set(actors.npc.id, now + 90_000);
    if (conversation.playerId && !conversation.text)
      this.playerAt.set(conversation.playerId, now + 120_000);
    if (conversation.otherNpc) this.npcAt.set(conversation.otherNpc, now + 90_000);
    const definition = VILLAGE_DEFINITION.villagers.find((n) => n.id === actors.npc.id)!;
    const context = JSON.stringify({
      character: definition.name,
      personality: definition.personality,
      setting:
        'Village square, Inn, Hall, Workshop, Storehouse and Lodge. Marta trades items; Hall, Workshop and Lodge have no services yet. Adventurers visit the forest.',
      listener: actors.target.name,
      task: conversation.text ? 'Reply to the quoted speech.' : 'Start a friendly conversation.',
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
          this.continuation = undefined;
          return;
        }
        this.silence(false);
        const current = this.participants(conversation);
        if (!current) return;
        current.npc.chat = result.text;
        current.npc.chatUntil = at + 10_000;
        this.world.chat = [
          ...(this.world.chat ?? []),
          {
            id: randomUUID(),
            playerId: '',
            npcId: current.npc.id,
            name: current.npc.name,
            text: result.text,
            dimension: 'village',
          },
        ].slice(-30);
        const line = `${current.npc.name}: ${result.text}`;
        for (const id of [current.npc.id, conversation.otherNpc].filter((id): id is string => !!id))
          this.memories.set(id, [...(this.memories.get(id) ?? []), line].slice(-6));
        if (conversation.otherNpc && !conversation.followup)
          this.continuation = {
            at: at + 6000,
            conversation: {
              speaker: conversation.otherNpc,
              otherNpc: current.npc.id,
              text: result.text,
              followup: true,
            },
          };
      })
      .catch(() => {
        if (!this.stopped && villagePlayers(this.world).length) {
          this.silence(true);
          this.retryAt = this.lastTick + 60_000;
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
