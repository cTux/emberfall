import { useEffect, useRef, useState } from 'react';
import { Button, Paper, TextField } from '@mui/material';
import { CHAT_MAX_LENGTH } from '@emberfall/core';
import type { ChatMessage, ClientMessage } from '@emberfall/common';

export function Chat({
  messages,
  send,
  disabled,
}: {
  messages: ChatMessage[];
  send: (message: ClientMessage) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const latestId = messages.at(-1)?.id;
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.key !== 'Enter' ||
        event.repeat ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        disabled ||
        input.current?.closest('[inert]') ||
        document.querySelector('[role="dialog"][aria-modal="true"]') ||
        (event.target as HTMLElement)?.closest(
          'input, textarea, select, button, a, [contenteditable=true]',
        )
      )
        return;
      event.preventDefault();
      input.current?.closest<HTMLElement>('.chat')?.focus();
      input.current?.focus();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [disabled]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [latestId]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          (entry.target as HTMLElement).style.visibility =
            entry.intersectionRatio < 1 ? 'hidden' : '';
        }
      },
      { root: log.current, threshold: 1 },
    );
    for (const message of log.current?.children ?? []) observer.observe(message);
    return () => observer.disconnect();
  }, [latestId]);
  return (
    // The chat region takes focus so keyboard users can reveal it before entering the input.
    <Paper
      component='aside'
      className='chat game-window-surface'
      aria-label='World chat'
      tabIndex={0}
      sx={{
        p: 1.5,
        typography: 'body2',
        '@media (hover: hover)': {
          '&:not(:hover):not(:focus-within)': {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
        },
      }}
    >
      <div className='chat-log' role='log' aria-label='Latest chat messages' ref={log}>
        {messages.map((message) => (
          <div key={message.id} className={message.tone ? `chat-${message.tone}` : undefined}>
            <b>{message.name}:</b> {message.text}
          </div>
        ))}
      </div>
      <form
        className='chat-input'
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled || !text.trim()) return;
          send({ type: 'chat', text: text.trim() });
          setText('');
          if (
            !event.currentTarget.closest('.chat')?.matches(':hover') &&
            document.activeElement instanceof HTMLElement &&
            event.currentTarget.contains(document.activeElement)
          )
            document.activeElement.blur();
        }}
      >
        <TextField
          inputRef={input}
          slotProps={{ htmlInput: { 'aria-label': 'Chat message', maxLength: CHAT_MAX_LENGTH } }}
          sx={{ minWidth: 0, '& input': { userSelect: 'text' } }}
          placeholder='Enter to chat · @Marta to talk'
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={disabled}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') input.current?.blur();
          }}
        />
        <Button type='submit' variant='contained' disabled={disabled || !text.trim()}>
          Send
        </Button>
      </form>
    </Paper>
  );
}
