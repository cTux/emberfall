import type { ArenaPresentation } from './arena-presentation';

export function updateFrameDiagnostics(
  element: HTMLCanvasElement,
  presented: ReturnType<ArenaPresentation['render']>,
) {
  element.dataset.daylight = presented.cycle.daylight.toFixed(3);
  element.dataset.celestial = presented.cycle.celestial;
  element.dataset.shadowDirection = `${presented.cycle.shadow.x.toFixed(3)},${presented.cycle.shadow.y.toFixed(3)}`;
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
