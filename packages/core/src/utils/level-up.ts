import { experienceRequired } from './experience-required.ts';

// PROG-02 caps normal levels at twenty; further advancement becomes uncapped paragon.
const MAX_NORMAL_LEVEL = 20;

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
