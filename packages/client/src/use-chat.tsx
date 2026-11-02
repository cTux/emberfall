import { ChatContext } from './chat-context.tsx';
import { useContext } from 'react';

export const useChat = () => {
  return useContext(ChatContext);
};
