import { useEffect, useMemo, useState } from 'react';
import type { ChatMessage, ClientMessage, Player, WorldState } from '@emberfall/common';
import { useChat } from './ChatProvider';

// Bound local cat interjections to the same ten-message visible chat budget as server messages.
const LOCAL_CAT_MESSAGE_LIMIT = 10;

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
  const worldId = world?.id;
  const serverMessages = world?.chat;
  const scene = me?.scene ?? 'village';
  const disabled = !world || status !== 'Connected';
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
      ].slice(-LOCAL_CAT_MESSAGE_LIMIT);
    });
  };

  const chatMessages = useMemo(() => {
    const localChatAfter = (id?: string) => {
      return catMessages
        .filter((entry) => {
          return entry.worldId === worldId && entry.afterId === id;
        })
        .map((entry) => {
          return entry.message;
        });
    };

    return [
      ...localChatAfter(),
      ...(serverMessages ?? []).flatMap((message) => {
        return [message, ...localChatAfter(message.id)];
      }),
    ];
  }, [worldId, serverMessages, catMessages]);
  useEffect(() => {
    configureChat({
      worldId,
      scene,
      messages: chatMessages,
      isVisible: (message) => {
        return (
          message.excludedPlayerId !== playerId &&
          (!message.dimension || message.dimension === scene)
        );
      },
      send,
      disabled,
    });
  }, [worldId, chatMessages, scene, playerId, disabled, send, configureChat]);
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
