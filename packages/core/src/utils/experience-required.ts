// PROG-02 starts the XP curve at fifty and doubles the requirement for every normal/paragon level.
const EXPERIENCE_CURVE = {
  base: 50,
  growth: 2,
} as const;
export const experienceRequired = (level: number, paragon = 0) => {
  return EXPERIENCE_CURVE.base * EXPERIENCE_CURVE.growth ** (level + paragon - 1);
};
