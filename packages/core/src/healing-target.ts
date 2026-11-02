import { type Player, DEFAULT_TACTICS, type Tactics } from '@emberfall/common';
import { forestDistance } from './scene.ts';

// Lower scores prioritize bosses, then elites, then ordinary enemies as the tactics setting promises.

export function healingTarget(
  players: Player[],
  owner: Player,
  point: { x: number; y: number },
  radius: number,
  below = 1,
) {
  const tactics = owner.tactics ?? DEFAULT_TACTICS;
  type Candidate = {
    body: Pick<Player, 'x' | 'y' | 'hitpoints' | 'maxHitpoints'>;
    player: boolean;
    self: boolean;
  };
  let best: Candidate | undefined;
  const score = (candidate: Candidate, rule: Tactics['defensive'][number]) => {
    return rule === 'lowestHealth'
      ? candidate.body.hitpoints / candidate.body.maxHitpoints
      : rule === 'players'
        ? Number(!candidate.player)
        : Number(!candidate.self);
  };

  for (const ally of players) {
    if (
      (ally !== owner && (!owner.partyId || ally.partyId !== owner.partyId)) ||
      ally.scene !== owner.scene ||
      ally.runId !== owner.runId ||
      ally.reconnecting
    ) {
      continue;
    }

    for (const body of [ally, ...(tactics.includeCompanions ? [ally.bear] : [])]) {
      if (
        !body ||
        body.hitpoints <= 0 ||
        body.hitpoints / body.maxHitpoints >= below ||
        forestDistance(body, point) > radius
      ) {
        continue;
      }

      const candidate: Candidate = { body, player: body === ally, self: body === owner };

      if (!best) {
        best = candidate;
      } else {
        for (const rule of tactics.defensive) {
          const difference = score(candidate, rule) - score(best, rule);

          if (difference < 0) {
            best = candidate;
          }

          if (difference !== 0) {
            break;
          }
        }
      }
    }
  }

  return best?.body;
}
