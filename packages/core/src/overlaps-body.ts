import { forestDistance } from './scene.ts';

export function overlapsBody(
  point: { x: number; y: number },
  radius: number,
  body: { x: number; y: number; radius: number },
) {
  return forestDistance(point, body) <= radius + body.radius;
}
