import type { ClientMessage } from '@emberfall/common';
import type { CommandContext, BroadcastState } from './models.ts';
import type { WorldMembership } from './world-membership.ts';
import {
  startGathering,
  gatheringNode,
  tickGathering,
  checkTimedActivity,
  castTalentAbility,
  requestPlayerCast,
} from '@emberfall/core';
type CommandType =
  | 'gather'
  | 'npcInteraction'
  | 'ping'
  | 'combatInput'
  | 'talentCast'
  | 'cast'
  | 'move';
type Messages = { [K in CommandType]: Extract<ClientMessage, { type: K }> };
type Handlers = { [K in CommandType]: (message: Messages[K], context: CommandContext) => void };
export function createRealtimeCommands({
  parties,
  resourceOwner,
  villageLife,
  broadcastState,
}: Pick<WorldMembership, 'parties' | 'resourceOwner' | 'villageLife'> & {
  broadcastState: BroadcastState;
}) {
  const handlers: Handlers = {
    gather: (message, { session, world, now, error }) => {
      const player = world?.players.get(session.id);
      if (!world || !player) {
        return;
      }

      const epoch = player.scene === 'forest' ? parties(world).run(player).scene?.id : 'lobby';
      if (message.epoch !== epoch) {
        return;
      }

      try {
        const activity = player.gathering;
        if (message.checkId) {
          if (!activity || activity.nodeId !== message.nodeId || activity.epoch !== epoch) {
            return;
          }

          gatheringNode(player, resourceOwner(world, player).resources, message.nodeId, now);
          if (
            message.at === undefined ||
            !checkTimedActivity(activity, message.checkId, message.at, now)
          ) {
            return;
          }

          tickGathering(player, (resourceOwner(world, player).resources ??= {}), epoch, now);
        } else if (!activity || activity.nodeId !== message.nodeId || activity.epoch !== epoch) {
          startGathering(
            player,
            resourceOwner(world, player).resources,
            message.nodeId,
            epoch,
            now,
          );
        }

        broadcastState(world, now);
      } catch (cause) {
        error(cause instanceof Error ? cause.message : 'Unable to gather.');
      }
    },
    npcInteraction: (message, { session, world, now }) => {
      const player = world?.players.get(session.id);
      if (world && player) {
        villageLife(world, now).interact(player, message.npcId);
      }
    },
    ping: (message, { reply }) => {
      reply({ type: 'pong', id: message.id });
    },
    combatInput: (message, { session, world, now }) => {
      const player = world?.players.get(session.id);
      if (player) {
        const { type: _, ...controls } = message;
        Object.assign(player, controls, { combatInputAt: now });
      }
    },
    talentCast: (message, { session, world, now }) => {
      const player = world?.players.get(session.id);
      if (player) {
        castTalentAbility(
          player.scene === 'forest' ? parties(world!).run(player).scene : world!.training,
          player,
          message,
          now,
          undefined,
          [...world!.players.values()],
        );
      }
    },
    cast: (message, { session, world, now }) => {
      const player = world?.players.get(session.id);
      if (player) {
        requestPlayerCast(
          player.scene === 'forest' ? parties(world!).run(player).scene : world!.training,
          player,
          message,
          now,
        );
      }
    },
    move: (message, { session, now }) => {
      if (session.worldId) {
        if (message.seq !== undefined) {
          if (message.seq <= session.lastSeq) {
            return;
          }

          const timed = message.durationMs !== undefined;
          if (session.timed !== undefined && session.timed !== timed) {
            return;
          }

          if (timed && session.inputs.length >= 40) {
            return;
          }

          session.timed = timed;
          session.lastSeq = message.seq;
          // Inputs are held directions, not movement impulses. Coalesce delayed heartbeats.
          const command = {
            seq: message.seq,
            x: message.x,
            y: message.y,
            epoch: message.epoch,
            durationMs: message.durationMs,
          };
          if (timed) {
            session.inputs.push(command);
          } else {
            session.inputs = [command];
          }
        } else if (session.lastSeq === 0) {
          session.x = message.x;
          session.y = message.y;
        }

        session.inputAt = now;
      }
    },
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
