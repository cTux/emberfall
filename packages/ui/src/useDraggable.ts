import {
  createContext,
  useContext,
  useCallback,
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
  const [element, setElement] = useState<HTMLElement | null>(null);
  // Dialog portals can attach their paper after this hook's first layout effect.
  const attachRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
    setElement(node);
  }, []);
  const drag = useRef<PanelPosition | null>(null);
  const [offset, setOffset] = useState(() => storage?.load(key) ?? { x: 0, y: 0 });
  const position = useRef(offset);
  const update = (next: PanelPosition) => {
    if (next.x === position.current.x && next.y === position.current.y) return;
    position.current = next;
    setOffset(next);
  };
  const move = (dx: number, dy: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    // Resize and ResizeObserver may run before React commits the previous move.
    // Clamp against the measured base position, not a second additive correction.
    const transform = new DOMMatrixReadOnly(getComputedStyle(ref.current!).transform);
    const baseX = box.left - transform.m41;
    const baseY = box.top - transform.m42;
    update({
      x: Math.max(-baseX, Math.min(window.innerWidth - box.width - baseX, position.current.x + dx)),
      y: Math.max(
        -baseY,
        Math.min(window.innerHeight - box.height - baseY, position.current.y + dy),
      ),
    });
  };
  useLayoutEffect(() => {
    if (!active || !element) return;
    const clamp = () => move(0, 0);
    const observer = new ResizeObserver(clamp);
    observer.observe(element);
    window.addEventListener("resize", clamp);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", clamp);
    };
  }, [active, key, element]);
  const finish = () => {
    if (!drag.current) return;
    drag.current = null;
    storage?.save(key, position.current);
  };
  return {
    ref: attachRef,
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
