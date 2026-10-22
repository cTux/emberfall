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
  { id: 'center', kind: 'center', previous: null, next: [], x: 500, y: 450 },
];
const kinds = ['power', 'speed', 'criticalChance', 'criticalDamage'] as const;
// Keep saved IDs, effects and prerequisites stable while replacing the old cross.
const paths = [
  [
    [450, 370],
    [360, 330],
    [300, 230],
    [200, 160],
  ],
  [
    [580, 410],
    [680, 440],
    [760, 340],
    [860, 280],
  ],
  [
    [540, 550],
    [620, 620],
    [570, 720],
    [660, 810],
  ],
  [
    [410, 500],
    [320, 560],
    [220, 510],
    [120, 600],
  ],
] as const;
const leaves = [
  [355, 425],
  [700, 540],
  [715, 680],
  [265, 655],
] as const;
for (let branch = 0; branch < paths.length; branch++) {
  paths[branch].forEach(([x, y], index) => {
    const step = index + 1;
    nodes.push({
      id: `path-${branch}-${step}`,
      kind: step === 4 ? 'ability' : kinds[(branch + step - 1) % 4],
      previous: step === 1 ? 'center' : `path-${branch}-${step - 1}`,
      next: [],
      x,
      y,
      ...(step === 4 ? { slot: branch } : {}),
    });
  });
  nodes.push({
    id: `leaf-${branch}`,
    kind: kinds[(branch + 3) % 4],
    previous: `path-${branch}-2`,
    next: [],
    x: leaves[branch][0],
    y: leaves[branch][1],
  });
}
// Uneven forks and winding side routes offer more choices within the same point budget.
const sideRoutes: readonly (readonly [string, number, number])[][] = [
  [
    ['path-0-1', 510, 295],
    ['branch-0-1', 565, 225],
    ['branch-0-1', 470, 205],
    ['branch-0-3', 420, 130],
    ['branch-0-3', 510, 90],
    ['path-0-3', 255, 315],
    ['branch-0-6', 180, 350],
    ['branch-0-7', 140, 260],
    ['branch-0-8', 80, 180],
  ],
  [
    ['path-1-1', 615, 320],
    ['branch-1-1', 660, 245],
    ['branch-1-2', 735, 220],
    ['branch-1-2', 710, 140],
    ['branch-1-3', 810, 130],
    ['path-1-3', 835, 410],
    ['branch-1-6', 910, 470],
    ['branch-1-6', 920, 370],
    ['path-1-4', 940, 230],
  ],
  [
    ['path-2-1', 450, 610],
    ['branch-2-1', 390, 690],
    ['branch-2-2', 450, 770],
    ['branch-2-2', 350, 780],
    ['branch-2-4', 340, 860],
    ['path-2-3', 510, 820],
    ['branch-2-6', 570, 875],
    ['leaf-2', 785, 735],
    ['branch-2-8', 840, 820],
  ],
  [
    ['path-3-1', 285, 410],
    ['branch-3-1', 210, 425],
    ['branch-3-2', 130, 445],
    ['branch-3-3', 70, 380],
    ['leaf-3', 190, 725],
    ['branch-3-5', 110, 750],
    ['branch-3-5', 90, 670],
    ['path-3-2', 365, 610],
    ['branch-3-8', 300, 720],
  ],
];
sideRoutes.forEach((route, branch) =>
  route.forEach(([previous, x, y], index) => {
    nodes.push({
      id: `branch-${branch}-${index + 1}`,
      kind: kinds[(branch + index) % kinds.length],
      previous,
      next: [],
      x,
      y,
    });
  }),
);
for (const node of nodes)
  node.next = nodes.filter((child) => child.previous === node.id).map((child) => child.id);
export const TALENT_TREE: readonly Readonly<TalentNode>[] = Object.freeze(
  nodes.map((node) => Object.freeze({ ...node, next: Object.freeze([...node.next]) })),
);
const nodesById = new Map(TALENT_TREE.map((node) => [node.id, node]));
export const TALENT_LABELS = {
  power: '+1 power',
  speed: '+10% attack speed',
  criticalChance: '+5% critical chance',
  criticalDamage: '+10% critical damage',
  center: 'Origin',
  ability: 'Ability',
};
export function isTalentLearned(progress: Pick<CharacterProgress, 'talents'>, id: string): boolean {
  const node = nodesById.get(id);
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
  const node = nodesById.get(id);
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
