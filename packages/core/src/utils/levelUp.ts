export const experienceRequired = (level: number, paragon = 0) => {
  return 50 * 2 ** (level + paragon - 1);
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
    if (level < 20) {
      level++;
    } else {
      paragon++;
    }

    requiredExperience = experienceRequired(level, paragon);
  }

  return { level, experience, paragon };
}
