export const Difficulty = {
  Easy: 'Easy',
  Medium: 'Medium',
  Hard: 'Hard',
} as const;

export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];
