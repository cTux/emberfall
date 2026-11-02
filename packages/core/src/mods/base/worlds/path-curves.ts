import { WARDROBE } from './wardrobe.ts';
import { BUILDINGS } from './buildings.ts';

// Cubic control points preserve the authored routes between the plaza, wardrobe and building doors.
export const PATH_CURVES = [
  [
    { x: WARDROBE.x, y: WARDROBE.y },
    { x: 350, y: 435 },
    { x: 420, y: 425 },
    { x: 480, y: 355 },
  ],
  [
    { x: BUILDINGS[0].doorX, y: BUILDINGS[0].y },
    { x: BUILDINGS[0].doorX, y: 320 },
    { x: 420, y: 235 },
    { x: 480, y: 355 },
  ],
  [
    { x: BUILDINGS[1].doorX, y: BUILDINGS[1].y },
    { x: 440, y: 240 },
    { x: 510, y: 275 },
    { x: 480, y: 355 },
  ],
  [
    { x: BUILDINGS[2].doorX, y: BUILDINGS[2].y },
    { x: 755, y: 330 },
    { x: 580, y: 260 },
    { x: 480, y: 355 },
  ],
  [
    { x: 480, y: 355 },
    { x: 430, y: 415 },
    { x: 535, y: 455 },
    { x: 480, y: 515 },
  ],
  [
    { x: 480, y: 515 },
    { x: 400, y: 530 },
    { x: 225, y: 585 },
    { x: BUILDINGS[3].doorX, y: BUILDINGS[3].y },
  ],
  [
    { x: 480, y: 515 },
    { x: 575, y: 525 },
    { x: 715, y: 585 },
    { x: BUILDINGS[4].doorX, y: BUILDINGS[4].y },
  ],
] as const;
