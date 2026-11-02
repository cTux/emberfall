import type { Session } from './session.tsx';
import { createContext } from 'react';

export const ChatContext = createContext<{
  reportError: (text: string) => void;
  configureChat: (session: Session | null) => void;
}>(null!);
