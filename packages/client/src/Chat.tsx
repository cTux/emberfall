import { useEffect, useRef, useState } from "react";
import { CHAT_MAX_LENGTH } from "@emberfall/common";
import type { ChatMessage, ClientMessage } from "@emberfall/common";

export function Chat({
  messages,
  send,
  disabled,
}: {
  messages: ChatMessage[];
  send: (message: ClientMessage) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const latestId = messages.at(-1)?.id;
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [latestId]);
  return (
    <aside className="chat" aria-label="World chat" tabIndex={0}>
      <div className="chat-log" role="log" aria-label="Latest chat messages" ref={log}>
        {messages.map((message) => (
          <div key={message.id}>
            <b>{message.name}:</b> {message.text}
          </div>
        ))}
      </div>
      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled || !text.trim()) return;
          send({ type: "chat", text: text.trim() });
          setText("");
        }}
      >
        <input
          aria-label="Chat message"
          placeholder="Click to chat · Enter to send"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={CHAT_MAX_LENGTH}
          disabled={disabled}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") event.currentTarget.blur();
          }}
        />
        <button type="submit" disabled={disabled || !text.trim()}>
          Send
        </button>
      </form>
    </aside>
  );
}
