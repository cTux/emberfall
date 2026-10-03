import { useEffect, useRef, useState } from "react";
import { CHAT_MAX_LENGTH } from "@emberfall/common-new";
import type { ChatMessage, ClientMessage } from "@emberfall/common-new";

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
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const latestId = messages.at(-1)?.id;
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.key !== "Enter" ||
        event.repeat ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        disabled ||
        input.current?.closest("[inert]") ||
        document.querySelector('[role="dialog"][aria-modal="true"]') ||
        (event.target as HTMLElement)?.closest(
          "input, textarea, select, button, a, [contenteditable=true]",
        )
      )
        return;
      event.preventDefault();
      input.current?.closest<HTMLElement>(".chat")?.focus();
      input.current?.focus();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [disabled]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [latestId]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          (entry.target as HTMLElement).style.visibility =
            entry.intersectionRatio < 1 ? "hidden" : "";
        }
      },
      { root: log.current, threshold: 1 },
    );
    for (const message of log.current?.children ?? []) observer.observe(message);
    return () => observer.disconnect();
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
          if (
            !event.currentTarget.closest(".chat")?.matches(":hover") &&
            document.activeElement instanceof HTMLElement &&
            event.currentTarget.contains(document.activeElement)
          )
            document.activeElement.blur();
        }}
      >
        <input
          ref={input}
          aria-label="Chat message"
          placeholder="Enter to chat · Enter to send"
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
