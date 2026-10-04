import type { Ref } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationArrow } from "@fortawesome/free-solid-svg-icons/faLocationArrow";
import { WorldLabelStyled, WorldLabelTextStyled } from "./styles";

export interface WorldLabelProps {
  text: string;
  kind: "chat" | "badge" | "navigation";
  active?: boolean;
  tone?: "party" | "boss" | "portal";
  ref?: Ref<HTMLDivElement>;
}

/** Host positions the anchor; text stays at browser resolution. No game state. */
export function WorldLabel({ text, kind, active = false, tone = "party", ref }: WorldLabelProps) {
  return (
    <WorldLabelStyled ref={ref} data-kind={kind} data-tone={tone} data-active={active}>
      {kind === "navigation" && (
        <FontAwesomeIcon icon={faLocationArrow} className="direction" aria-hidden="true" />
      )}
      <WorldLabelTextStyled data-kind={kind}>
        {active && kind === "badge" ? `(E) ${text}` : text}
      </WorldLabelTextStyled>
    </WorldLabelStyled>
  );
}
