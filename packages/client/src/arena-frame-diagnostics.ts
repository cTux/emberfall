import type { ArenaPresentation } from './arena-presentation';

// Three decimal places expose small lighting changes without unstable full-precision dataset text.
const DIAGNOSTIC_DECIMALS = 3;

export function updateFrameDiagnostics(
  element: HTMLCanvasElement,
  presented: ReturnType<ArenaPresentation['render']>,
) {
  element.dataset.daylight = presented.cycle.daylight.toFixed(DIAGNOSTIC_DECIMALS);
  element.dataset.celestial = presented.cycle.celestial;
  element.dataset.shadowDirection = `${presented.cycle.shadow.x.toFixed(DIAGNOSTIC_DECIMALS)},${presented.cycle.shadow.y.toFixed(DIAGNOSTIC_DECIMALS)}`;
  element.dataset.partyRequests =
    presented.view?.partyRequests
      ?.map((r) => {
        return r.fromId;
      })
      .join(',') ?? '';

  if (element.dataset.cursor !== presented.cursor) {
    element.dataset.cursor = presented.cursor;
  }
}
