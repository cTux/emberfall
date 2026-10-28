import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TalentTree } from '../index';
const meta = {
  title: 'Components/TalentTree',
  component: TalentTree,
  tags: ['autodocs'],
} satisfies Meta<typeof TalentTree>;
export default meta;
type Story = StoryObj<typeof meta>;
const columns = ['Weapon Mastery', 'Bloodletting', 'Guardian'];
const nodes = Array.from({ length: 30 }, (_, index) => ({
  id: `node-${index}`,
  previous: null,
  x: index % 3,
  y: Math.floor(index / 3),
  column: index % 3,
  row: Math.floor(index / 3),
  level: index < 3 ? 1 : Math.floor(index / 3) * 2,
  name:
    index === 0
      ? 'Follow Through'
      : index === 1
        ? 'Open Wounds'
        : index === 2
          ? 'Reactive Guard'
          : `Talent ${index + 1}`,
  description:
    'Rank 1 unlocks a combat interaction. Rank 2 improves its effect. No prerequisite talents.',
  learned: false,
  available: true,
  rank: 0,
  kind: [1, 3, 5, 7].includes(Math.floor(index / 3))
    ? ('ability' as const)
    : ('extension' as const),
}));
export const Interactive: Story = {
  args: { nodes, columns, points: 2, onLearn: () => {} },
  render: function Example() {
    const [ranks, setRanks] = useState<Record<string, number>>({});
    const points = 2 - Object.values(ranks).reduce((sum, value) => sum + value, 0);
    return (
      <TalentTree
        columns={columns}
        nodes={nodes.map((node) => ({
          ...node,
          rank: ranks[node.id] ?? 0,
          learned: !!ranks[node.id],
          available: points > 0 && (ranks[node.id] ?? 0) < 2,
        }))}
        points={points}
        onLearn={(id) => setRanks({ ...ranks, [id]: (ranks[id] ?? 0) + 1 })}
      />
    );
  },
};
export const NoPoints: Story = {
  args: {
    nodes: nodes.map((node) => ({ ...node, available: false })),
    columns,
    points: 0,
    onLearn: () => {},
  },
};
