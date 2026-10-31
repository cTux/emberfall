import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ChatMessage, ClientMessage } from '@emberfall/common';
import { ThemeProvider, type Theme } from '@mui/material';
import { Chat } from './Chat';

// Isolate modal siblings so the persistent chat log remains available to assistive technology.
const chatTheme = (theme: Theme) => {
  return {
    ...theme,
    components: {
      ...theme.components,
      MuiDialog: {
        ...theme.components?.MuiDialog,
        defaultProps: {
          ...theme.components?.MuiDialog?.defaultProps,
          container: () => {
            return document.getElementById('dialogs')!;
          },
        },
      },
    },
  };
};

type Session = {
  worldId?: string;
  scene?: string;
  messages: ChatMessage[];
  isVisible: (message: ChatMessage) => boolean;
  send: (message: ClientMessage) => void;
  disabled: boolean;
};
const emptySession: Session = {
  messages: [],
  isVisible: () => {
    return true;
  },
  send: () => {},
  disabled: true,
};
const ChatContext = createContext<{
  reportError: (text: string) => void;
  configureChat: (session: Session | null) => void;
}>(null!);

export const useChat = () => {
  return useContext(ChatContext);
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(emptySession);
  const currentSession = useRef(session);
  const [entries, setEntries] = useState<
    { message: ChatMessage; local: boolean; afterId?: string }[]
  >([]);
  const configureChat = useCallback((next: Session | null) => {
    const previous = currentSession.current;
    const current = next ?? emptySession;
    currentSession.current = current;
    setSession(current);
    setEntries((log) => {
      const sameWorld = previous.worldId === current.worldId;
      if (sameWorld && previous.scene !== current.scene) {
        const errors = log.filter((entry) => {
          return entry.local;
        });

        return [
          ...current.messages.flatMap((message) => {
            return [
              { message, local: false },
              ...errors.filter((entry) => {
                return entry.afterId === message.id;
              }),
            ];
          }),
          ...errors.filter((entry) => {
            return !current.messages.some((message) => {
              return message.id === entry.afterId;
            });
          }),
        ].slice(-20);
      }

      const retained = log.filter((entry) => {
        return (
          entry.local ||
          (sameWorld &&
            current.messages.some((message) => {
              return message.id === entry.message.id;
            }))
        );
      });
      const received = current.messages
        .filter((message) => {
          return (
            !sameWorld ||
            !previous.messages.some((old) => {
              return old.id === message.id;
            })
          );
        })
        .map((message) => {
          return { message, local: false };
        });

      // Retain room for the visible world buffer and private errors before applying the display limit.
      return (sameWorld ? [...retained, ...received] : [...received, ...retained]).slice(-20);
    });
  }, []);
  const reportError = useCallback((text: string) => {
    setEntries((log) => {
      return [
        ...log,
        {
          local: true,
          afterId: currentSession.current.messages.at(-1)?.id,
          message: {
            id: crypto.randomUUID(),
            playerId: '',
            name: 'System',
            text,
            tone: 'danger' as const,
          },
        },
      ].slice(-20);
    });
  }, []);
  const context = useMemo(() => {
    return { reportError, configureChat };
  }, [reportError, configureChat]);

  return (
    <ChatContext value={context}>
      <ThemeProvider theme={chatTheme}>{children}</ThemeProvider>
      <div className={session.worldId ? 'in-world' : undefined}>
        <Chat
          key={session.worldId}
          messages={entries
            .filter((entry) => {
              return entry.local || session.isVisible(entry.message);
            })
            .map((entry) => {
              return entry.message;
            })
            .slice(-10)}
          send={session.send}
          disabled={session.disabled}
        />
      </div>
    </ChatContext>
  );
}
