import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

export type PanelPosition = { x: number; y: number };
export const PanelPositionContext = createContext<{
  load(key: string): PanelPosition;
  save(key: string, position: PanelPosition): void;
} | null>(null);

/** Shared viewport-constrained dragging; the host owns persistence. */
export function useDraggable(key: string, active = true) {
  const storage = useContext(PanelPositionContext);
  const ref = useRef<HTMLElement | null>(null);
  const drag = useRef<PanelPosition | null>(null);
  const [offset, setOffset] = useState(() => storage?.load(key) ?? { x: 0, y: 0 });
  const position = useRef(offset);
  const update = (next: PanelPosition) => {
    position.current = next;
    setOffset(next);
  };
  const move = (dx: number, dy: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    update({
      x: position.current.x + Math.max(-box.left, Math.min(window.innerWidth - box.right, dx)),
      y: position.current.y + Math.max(-box.top, Math.min(window.innerHeight - box.bottom, dy)),
    });
  };
  useLayoutEffect(() => {
    if (!active || !ref.current) return;
    const clamp = () => move(0, 0);
    const observer = new ResizeObserver(clamp);
    observer.observe(ref.current);
    window.addEventListener("resize", clamp);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", clamp);
    };
  }, [active, key]);
  const finish = () => {
    if (!drag.current) return;
    drag.current = null;
    storage?.save(key, position.current);
  };
  return {
    ref: (element: HTMLElement | null) => {
      ref.current = element;
    },
    style: { transform: `translate(${offset.x}px, ${offset.y}px)` },
    handleProps: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, a")) return;
        event.stopPropagation();
        drag.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        if (!drag.current) return;
        move(event.clientX - drag.current.x, event.clientY - drag.current.y);
        drag.current = { x: event.clientX, y: event.clientY };
      },
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
    },
  };
}
