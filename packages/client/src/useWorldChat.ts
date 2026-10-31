import { useEffect, useMemo, useState } from 'react';
import type { ChatMessage, ClientMessage, Player, WorldState } from '@emberfall/common';
import { useChat } from './ChatProvider';

export function useWorldChat({
  world,
  me,
  playerId,
  status,
  send,
}: {
  world: WorldState | null;
  me?: Player;
  playerId: string;
  status: string;
  send: (message: ClientMessage) => void;
}) {
  const { configureChat } = useChat();
  const [catMessages, setCatMessages] = useState<
    { worldId: string; afterId?: string; message: ChatMessage }[]
  >([]);
  const catSpoke = (text: string) => {
    if (!world) {
      return;
    }

    setCatMessages((messages) => {
      return [
        ...messages.filter((entry) => {
          return entry.worldId === world.id;
        }),
        {
          worldId: world.id,
          afterId: world.chat?.at(-1)?.id,
          message: {
            id: crypto.randomUUID(),
            playerId: '',
            name: 'Cat',
            text,
            dimension: 'village',
          },
        },
      ].slice(-10);
    });
  };

  const chatMessages = useMemo(() => {
    const localChatAfter = (id?: string) => {
      return catMessages
        .filter((entry) => {
          return entry.worldId === world?.id && entry.afterId === id;
        })
        .map((entry) => {
          return entry.message;
        });
    };

    return [
      ...localChatAfter(),
      ...(world?.chat ?? []).flatMap((message) => {
        return [message, ...localChatAfter(message.id)];
      }),
    ];
  }, [world, catMessages]);
  useEffect(() => {
    configureChat({
      worldId: world?.id,
      scene: me?.scene ?? 'village',
      messages: chatMessages,
      isVisible: (message) => {
        return (
          message.excludedPlayerId !== playerId &&
          (!message.dimension || message.dimension === (me?.scene ?? 'village'))
        );
      },
      send,
      disabled: !world || status !== 'Connected',
    });
  }, [world, chatMessages, me?.scene, playerId, status, send, configureChat]);
  useEffect(() => {
    return () => {
      return configureChat(null);
    };
  }, [configureChat]);

  return {
    catSpoke,
    clearCatMessages: () => {
      return setCatMessages([]);
    },
  };
}
