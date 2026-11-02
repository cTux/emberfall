export type ForestProjection = {
  cx: number;
  cy: number;
  width: number;
  height: number;
  near: (x: number, y: number) => { x: number; y: number };
};
