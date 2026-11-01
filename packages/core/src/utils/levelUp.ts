// PROG-02 starts the XP curve at fifty and doubles the requirement for every normal/paragon level.
const EXPERIENCE_CURVE = { base: 50, growth: 2 } as const;
// PROG-02 caps normal levels at twenty; further advancement becomes uncapped paragon.
const MAX_NORMAL_LEVEL = 20;

export const experienceRequired = (level: number, paragon = 0) => {
  return EXPERIENCE_CURVE.base * EXPERIENCE_CURVE.growth ** (level + paragon - 1);
};

export function levelUp({
  level,
  experience,
  paragon = 0,
}: {
  level: number;
  experience: number;
  paragon?: number;
}) {
  let requiredExperience = experienceRequired(level, paragon);
  while (experience >= requiredExperience) {
    experience -= requiredExperience;

    if (level < MAX_NORMAL_LEVEL) {
      level++;
    } else {
      paragon++;
    }

    requiredExperience = experienceRequired(level, paragon);
  }

  return { level, experience, paragon };
}
