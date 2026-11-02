export type Hitbox = {
  x: number;
  y: number;
  color: string;
  label?: string;
  angle?: number;
} & ({ radius: number } | { width: number; height: number });
