import { prepareTalentCast } from './targeting.ts';
import { defensive } from './defensive.ts';
import { companion } from './companion.ts';
import { woundBurst } from './woundBurst.ts';
import { offensive } from './offensive.ts';
import { talentCast, type TalentMechanic } from '../configs/talentCast.ts';

const handlers = { defensive, companion, woundBurst, offensive } satisfies Record<
  TalentMechanic,
  (cast: ReturnType<typeof prepareTalentCast>) => void
>;
export function executeTalent(...args: Parameters<typeof prepareTalentCast>) {
  const cast = prepareTalentCast(...args);
  const mechanic = (talentCast.classMechanics[cast.classId] ?? talentCast.mechanics)[cast.slot];
  handlers[mechanic](cast);
}
