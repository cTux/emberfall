import { randomUUID } from 'node:crypto';
import { forestDistance, nearbyInteraction, wrap, wrappedDelta } from '@emberfall/core';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import type { ChatMessage, Player, VillageNpc } from '@emberfall/common';
import { simulationFor } from './ecs/simulation.ts';
import type { NpcDialogue } from './npc-models.ts';
import { spokenLine } from './npc-models.ts';

export interface NpcWorld {
  players: Map<string, Player>;
  npcs?: VillageNpc[];
  chat?: ChatMessage[];
}
const PLAYER_RANGE = 120;
const NPC_RANGE = 160;
const SPEED = 38;
const REPLY_DELAY = 2000;
const villagePlayers = (world: NpcWorld) =>
  [...world.players.values()].filter((p) => !p.scene && p.hitpoints > 0 && !p.reconnecting);
interface Routine {
  stop: number;
  pauseUntil: number;
  returnAt: number;
  station: number;
  work?: { remaining: number; elapsed: number };
}
interface Conversation {
  speaker: string;
  playerId?: string;
  otherNpc?: string;
  text?: string;
  /** Number of lines already published in this exchange. */
  lines?: number;
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
  private walks = new Map<string, Routine>();
  private interactions = new Map<string, string>();
  private memories = new Map<string, string[]>();
  private reply?: { at: number; conversation: Conversation };
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
        returnAt: now + 25_000 + this.random() * 20_000,
        station: 0,
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
    const npc = this.world.npcs.find((npc) => npc.id === npcId)!;
    npc.moving = false;
    npc.workstationId = npc.workStartedAt = undefined;
    npc.angle = Math.atan2(
      wrappedDelta(player.y, npc.y, VILLAGE_DEFINITION.geometry.height),
      wrappedDelta(player.x, npc.x, VILLAGE_DEFINITION.geometry.width),
    );
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
      npc.workstationId = npc.workStartedAt = undefined;
      if (
        !players.length ||
        occupied ||
        continuing ||
        interacting.has(npc.id) ||
        this.reply?.conversation.speaker === npc.id ||
        (npc.chatUntil ?? 0) > now
      ) {
        npc.moving = false;
        continue;
      }
      const returning = now >= walk.returnAt;
      const stations = VILLAGE_DEFINITION.workstations.filter((s) => s.npcId === npc.id);
      const station = stations[walk.station % stations.length];
      if (walk.work && station) {
        npc.moving = false;
        npc.angle = Math.atan2(
          wrappedDelta(station.y - 18, npc.y - 24, VILLAGE_DEFINITION.geometry.height),
          wrappedDelta(station.x, npc.x, VILLAGE_DEFINITION.geometry.width),
        );
        npc.workstationId = station.id;
        npc.workStartedAt = now - walk.work.elapsed;
        const active = Math.max(0, dt * 1000);
        walk.work.remaining -= active;
        walk.work.elapsed += active;
        if (walk.work.remaining <= 0) {
          walk.work = undefined;
          walk.station++;
          walk.returnAt = now + 25_000 + this.random() * 20_000;
          walk.pauseUntil = now + 5000 + this.random() * 4000;
          walk.stop = this.chooseStop(walk.stop);
          npc.workstationId = npc.workStartedAt = undefined;
        }
        continue;
      }
      if (!returning && now < walk.pauseUntil) {
        npc.moving = false;
        continue;
      }
      const target =
        returning && station
          ? station.worker
          : VILLAGE_DEFINITION.npcStops[walk.stop % VILLAGE_DEFINITION.npcStops.length];
      const dx = wrappedDelta(target.x, npc.x, VILLAGE_DEFINITION.geometry.width),
        dy = wrappedDelta(target.y, npc.y, VILLAGE_DEFINITION.geometry.height);
      const distance = Math.hypot(dx, dy);
      const step = Math.min(distance, SPEED * dt);
      if (distance < 1) {
        npc.x = target.x;
        npc.y = target.y;
        if (returning && station) {
          walk.work = { remaining: 60_000 + this.random() * 30_000, elapsed: 0 };
          npc.workstationId = station.id;
          npc.workStartedAt = now;
          npc.angle = Math.atan2(station.y - npc.y + 6, station.x - npc.x);
        } else {
          walk.stop = this.chooseStop(walk.stop);
          walk.pauseUntil = now + 5000 + this.random() * 4000;
        }
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
      if (now < this.reply.at) return;
      const { conversation } = this.reply;
      this.reply = undefined;
      this.start(conversation, now);
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
    const context = JSON.stringify({
      character: definition.name,
      personality: definition.personality,
      setting:
        'Emberfall is a cooperative medieval fantasy game. Adventurers prepare in the village, fight monsters and a Brute Boss in the forest, and return with loot. Marta trades consumables and collected items. The Storehouse stores items. The Inn is scenery; Hall, Workshop and Lodge have no services yet. Do not invent active festivals, quests or services.',
      residents: VILLAGE_DEFINITION.villagers.map(
        (npc) => `@${npc.name.split(' ')[0]}: ${npc.name}`,
      ),
      listener: actors.target.name,
      listenerMention: conversation.otherNpc ? `@${actors.target.name.split(' ')[0]}` : undefined,
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
