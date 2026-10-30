import { randomUUID } from 'node:crypto';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import type { VillageNpc } from '@emberfall/common';
import { spokenLine } from './npc-models.ts';
import type { NpcWorld } from './npc-world.ts';

export interface Conversation {
  speaker: string;
  playerId?: string;
  otherNpc?: string;
  text?: string;
  /** Number of lines already published in this exchange. */
  lines?: number;
  topic?: string;
}

/** Per-world conversation topics, prompt context and published speech history. */
export class NpcSpeech {
  private memories = new Map<string, string[]>();
  private topics = new Map<string, { remaining: string[]; last?: string }>();
  private world: NpcWorld;
  private random: () => number;
  constructor(world: NpcWorld, random: () => number) {
    this.world = world;
    this.random = random;
  }
  chooseTopic(npcId: string) {
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
  context(conversation: Conversation, npc: VillageNpc, target: { name: string }) {
    const definition = VILLAGE_DEFINITION.villagers.find((n) => n.id === npc.id)!;
    if (!conversation.text) conversation.topic = this.chooseTopic(npc.id);
    return JSON.stringify({
      character: definition.name,
      personality: definition.personality,
      background: definition.background,
      setting:
        'Emberfall is a cooperative medieval fantasy game. Adventurers prepare in the village, fight monsters and a Brute Boss in the forest, and return with loot. Marta sells consumables and resources; Bram sells gear. Both buy collected items and offer buyback. The Storehouse stores items. The Inn is scenery; Hall and Lodge have no services yet. Do not invent active festivals, quests or services.',
      residents: VILLAGE_DEFINITION.villagers.map(
        (npc) => `@${npc.name.split(' ')[0]}: ${npc.name}`,
      ),
      listener: target.name,
      listenerMention: conversation.otherNpc ? `@${target.name.split(' ')[0]}` : undefined,
      task: conversation.text
        ? 'Reply to the quoted speech, drawing on your background when relevant.'
        : 'Start a friendly conversation about the selected topic with a personal detail or a question.',
      topic: conversation.topic,
      quotedSpeech: conversation.text,
      recentConversation: this.memories.get(npc.id) ?? [],
    });
  }
  publish(conversation: Conversation, npc: VillageNpc, raw: string, at: number) {
    let text = raw;
    for (const resident of VILLAGE_DEFINITION.villagers) {
      const name = resident.name.split(' ')[0];
      text = text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])@?${name}\\b`, 'giu'), `@${name}`);
    }
    text = spokenLine(text);
    npc.chat = text;
    npc.chatUntil = at + 10_000;
    this.world.chat = [
      ...(this.world.chat ?? []),
      {
        id: randomUUID(),
        playerId: '',
        npcId: npc.id,
        name: npc.name,
        text,
        dimension: 'village',
      },
    ].slice(-30);
    const mentioned = [...text.matchAll(/@([\p{L}]+)/gu)]
      .map((match) => this.world.npcs?.find((npc) => npc.name.split(' ')[0] === match[1]))
      .find((candidate) => candidate && candidate.id !== npc.id);
    const line = `${npc.name}: ${text}`;
    for (const id of new Set(
      [npc.id, conversation.otherNpc, mentioned?.id].filter((id): id is string => !!id),
    ))
      this.memories.set(id, [...(this.memories.get(id) ?? []), line].slice(-6));
    return { text, mentioned };
  }
  silence(value: boolean) {
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
