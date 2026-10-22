import type { CharacterProgress } from '@emberfall/common';

export type TalentKind =
  | 'power'
  | 'speed'
  | 'criticalChance'
  | 'criticalDamage'
  | 'ability'
  | 'center';
export interface TalentNode {
  id: string;
  kind: TalentKind;
  previous: string | null;
  next: readonly string[];
  x: number;
  y: number;
  slot?: number;
}
const nodes: TalentNode[] = [
  { id: 'center', kind: 'center', previous: null, next: [], x: 320, y: 320 },
];
const kinds = ['power', 'speed', 'criticalChance', 'criticalDamage'] as const;
for (let branch = 0; branch < 4; branch++) {
  const angle = -Math.PI / 2 + (branch * Math.PI) / 2;
  for (let step = 1; step <= 4; step++) {
    nodes.push({
      id: `path-${branch}-${step}`,
      kind: step === 4 ? 'ability' : kinds[(branch + step - 1) % 4],
      previous: step === 1 ? 'center' : `path-${branch}-${step - 1}`,
      next: [],
      x: 320 + Math.cos(angle) * step * 65,
      y: 320 + Math.sin(angle) * step * 65,
      ...(step === 4 ? { slot: branch } : {}),
    });
  }
  const side = angle + Math.PI / 4;
  nodes.push({
    id: `leaf-${branch}`,
    kind: kinds[(branch + 3) % 4],
    previous: `path-${branch}-2`,
    next: [],
    x: 320 + Math.cos(side) * 185,
    y: 320 + Math.sin(side) * 185,
  });
}
for (const node of nodes)
  node.next = nodes.filter((child) => child.previous === node.id).map((child) => child.id);
export const TALENT_TREE: readonly Readonly<TalentNode>[] = Object.freeze(
  nodes.map((node) => Object.freeze({ ...node, next: Object.freeze([...node.next]) })),
);
export const TALENT_LABELS = {
  power: '+1 power',
  speed: '+10% attack speed',
  criticalChance: '+5% critical chance',
  criticalDamage: '+10% critical damage',
  center: 'Origin',
  ability: 'Ability',
};
export function isTalentLearned(progress: Pick<CharacterProgress, 'talents'>, id: string): boolean {
  const node = TALENT_TREE.find((entry) => entry.id === id);
  return (
    !!node &&
    (id === 'center' ||
      (progress.talents?.[id] === 1 && !!node.previous && isTalentLearned(progress, node.previous)))
  );
}
export function availableTalentPoints(progress: Pick<CharacterProgress, 'level' | 'talents'>) {
  return Math.max(
    0,
    Math.min(20, progress.level) -
      1 -
      TALENT_TREE.filter((node) => node.id !== 'center' && isTalentLearned(progress, node.id))
        .length,
  );
}
export function canLearnTalent(progress: Pick<CharacterProgress, 'level' | 'talents'>, id: string) {
  const node = TALENT_TREE.find((entry) => entry.id === id);
  return (
    !!node?.previous &&
    !isTalentLearned(progress, id) &&
    isTalentLearned(progress, node.previous) &&
    availableTalentPoints(progress) > 0
  );
}
export function learnTalent(progress: Pick<CharacterProgress, 'level' | 'talents'>, id: string) {
  if (!canLearnTalent(progress, id))
    throw new Error('Talent is locked, already learned, or no points remain.');
  progress.talents = { ...progress.talents, [id]: 1 };
}
