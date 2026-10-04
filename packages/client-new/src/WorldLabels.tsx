import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { WorldLabel } from "@emberfall/ui";
import type { WorldLabelProps } from "@emberfall/ui";

export type Label = Omit<WorldLabelProps, "ref"> & {
  id: string;
  x: number;
  y: number;
  angle?: number;
};
export type AddLabel = (label: Label) => void;

/** React owns content. The render loop moves anchors without per-frame React renders. */
export function useWorldLabels() {
  const [content, setContent] = useState<Label[]>([]);
  const frame = useRef<Label[]>([]);
  const signature = useRef("");
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const position = useCallback(() => {
    for (const label of frame.current) {
      const node = nodes.current.get(label.id);
      if (!node) continue;
      const width = node.offsetWidth,
        height = node.offsetHeight;
      let x = label.x - width / 2,
        y = label.y - height;
      if (label.kind === "navigation") {
        x = Math.max(8, Math.min(innerWidth - width - 8, x));
        y = Math.max(24, Math.min(innerHeight - height - 8, y));
      }
      node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      if (label.angle !== undefined) node.style.setProperty("--direction", `${label.angle}rad`);
    }
  }, []);
  useLayoutEffect(position, [content, position]);
  const publish = useCallback(
    (labels: Label[]) => {
      frame.current = labels;
      const next = JSON.stringify(labels.map(({ x: _x, y: _y, angle: _angle, ...label }) => label));
      if (next !== signature.current) {
        signature.current = next;
        setContent(labels);
      }
      position();
    },
    [position],
  );
  const overlay = (
    <div className="world-labels" aria-label="World labels">
      {content.map((label) => (
        <WorldLabel
          key={label.id}
          text={label.text}
          kind={label.kind}
          active={label.active}
          tone={label.tone}
          ref={(node) => {
            if (node) nodes.current.set(label.id, node);
            else nodes.current.delete(label.id);
          }}
        />
      ))}
    </div>
  );
  return { publish, overlay };
}
