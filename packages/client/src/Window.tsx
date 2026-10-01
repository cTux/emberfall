import { useEffect, useRef } from "react";
import type { ReactNode, PointerEvent } from "react";

export function GameWindow({
  title,
  children,
  onClose,
  modal = true,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  modal?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (modal) ref.current?.showModal();
  }, [modal]);
  useEffect(() => {
    const clamp = () => {
      const box = titleRef.current?.parentElement;
      if (!box?.style.left) return;
      box.style.left = `${Math.max(0, Math.min(innerWidth - box.offsetWidth, parseFloat(box.style.left)))}px`;
      box.style.top = `${Math.max(0, Math.min(innerHeight - 48, parseFloat(box.style.top)))}px`;
    };
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const box = event.currentTarget.parentElement!;
    box.style.left = `${Math.max(0, Math.min(innerWidth - box.offsetWidth, event.clientX - drag.current.x))}px`;
    box.style.top = `${Math.max(0, Math.min(innerHeight - 48, event.clientY - drag.current.y))}px`;
    box.style.margin = "0";
    box.style.transform = "none";
  };
  const contents = (
    <>
      <div
        className="window-title"
        ref={titleRef}
        onPointerDown={(e) => {
          if (e.target instanceof HTMLButtonElement) return;
          const rect = e.currentTarget.parentElement!.getBoundingClientRect();
          drag.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <h2>{title}</h2>
        <button
          className="close-menu"
          aria-label={modal ? "Close menu" : `Close ${title}`}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </>
  );
  return modal ? (
    <dialog
      ref={ref}
      className={`menu panel game-window ${className}`}
      aria-label={title}
      onCancel={onClose}
      onClose={onClose}
    >
      {contents}
    </dialog>
  ) : (
    <section className={`lobby panel game-window ${className}`} aria-label={title}>
      {contents}
    </section>
  );
}
