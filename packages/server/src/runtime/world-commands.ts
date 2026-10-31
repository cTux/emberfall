import type { ClientMessage } from '@emberfall/common';
import type { CommandContext, BroadcastState, Session, Snapshot } from './models.ts';
import type { WorldMembership } from './world-membership.ts';
import { nearbyInteraction } from '@emberfall/core';
import { sceneAction } from '../scenes.ts';
import { addChat } from '../chat.ts';
import type { CharacterStore } from '../characters.ts';
type CommandType =
  | 'chat'
  | 'partyInteract'
  | 'leave'
  | 'selectClass'
  | 'createScene'
  | 'joinScene'
  | 'ready'
  | 'returnLobby'
  | 'leaveScene';
type Messages = { [K in CommandType]: Extract<ClientMessage, { type: K }> };
type Handlers = { [K in CommandType]: (message: Messages[K], context: CommandContext) => void };
type SceneMessage = Extract<
  ClientMessage,
  { type: 'createScene' | 'joinScene' | 'ready' | 'returnLobby' | 'leaveScene' }
>;
export function createWorldCommands({
  parties,
  villageLife,
  characters,
  state,
  leave,
  broadcastList,
  broadcastState,
}: Pick<WorldMembership, 'parties' | 'villageLife'> & {
  characters: Pick<CharacterStore, 'forgetWorld' | 'selectClass'>;
  state: Snapshot;
  leave: (session: Session) => void;
  broadcastList: () => void;
  broadcastState: BroadcastState;
}) {
  const scene = (message: SceneMessage, { session, world, now, error }: CommandContext) => {
    const player = world?.players.get(session.id);
    if (!world || !player) {
      error('Join a world first.');
      return;
    }
    try {
      const previousArea = player.scene;
      if (message.type === 'createScene' && player.partyId && player.partyLeaderId !== player.id)
        throw new Error('Only the party leader can create a dimension.');
      const run = parties(world).run(player);
      const key = parties(world).key(player);
      run.chat = world.chat;
      sceneAction(run, player, message, now);
      if (message.type === 'createScene') run.resources = {};
      world.chat = run.chat;
      if (player.scene) player.runId = key;
      else delete player.runId;
      if (player.scene !== previousArea) delete player.gathering;
      session.x = 0;
      session.y = 0;
    } catch (cause) {
      error((cause as Error).message);
    }
  };
  const handlers: Handlers = {
    chat: (message, { session, world, now, error }) => {
      const player = world?.players.get(session.id);
      if (!world || !player) {
        error('Join a world first.');
        return;
      }
      if (now - (session.chatAt ?? 0) < 500) {
        error('Please wait a moment before sending another chat message.');
        return;
      }
      session.chatAt = now;
      if (message.text.startsWith('/')) {
        try {
          parties(world).command(player, message.text, now);
        } catch (cause) {
          parties(world).announce((cause as Error).message, [player.id]);
        }
        broadcastState(world, now);
        return;
      }
      player.chat = message.text;
      addChat(world, message.text, player);
      villageLife(world, now).hear(player, message.text, now);
      broadcastState(world, now);
    },
    partyInteract: (message, { session, world, now, error }) => {
      const player = world?.players.get(session.id);
      if (!world || !player) {
        error('Join a world first.');
        return;
      }
      if (now - (session.chatAt ?? 0) < 500) {
        error('Please wait a moment.');
        return;
      }
      session.chatAt = now;
      try {
        parties(world).interact(player, message.targetId, now);
      } catch (cause) {
        parties(world).announce((cause as Error).message, [player.id]);
      }
      broadcastState(world, now);
    },
    leave: (_message, { session, reply, error }) => {
      try {
        leave(session);
        if (session.characterId) characters.forgetWorld(session.characterId);
      } catch {
        error('Save failed. Your character is still in this world; please retry.');
        return;
      }
      reply({ type: 'saved', savedAt: Date.now() });
      reply({ type: 'left' });
      broadcastList();
    },
    selectClass: (message, { session, world, now, reply, error }) => {
      const player = world?.players.get(session.id);
      if (
        !player ||
        !session.characterId ||
        player.scene ||
        (world && parties(world).run(player).scene?.phase === 'countdown') ||
        nearbyInteraction(player)?.id !== 'wardrobe'
      ) {
        error('Use the village wardrobe before the departure countdown to change class.');
        return;
      }
      try {
        characters.selectClass(session.characterId, player, message.classId);
        delete player.gathering;
        reply({ type: 'state', world: state(world!, now, player) });
      } catch {
        error('Unable to save class change. Your current class has been kept.');
      }
    },
    createScene: scene,
    joinScene: scene,
    ready: scene,
    returnLobby: scene,
    leaveScene: scene,
  };
  function handles(message: ClientMessage): message is Messages[CommandType] {
    return Object.hasOwn(handlers, message.type);
  }
  function execute<K extends CommandType>(
    message: Messages[K] & { type: K },
    context: CommandContext,
  ) {
    handlers[message.type](message, context);
  }
  return { handles, execute };
}
