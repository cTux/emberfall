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
const nodes = [
  {
    id: 'center',
    previous: null,
    x: 320,
    y: 320,
    name: 'Origin',
    description: 'Free starting node',
    learned: true,
    available: false,
  },
  {
    id: 'power',
    previous: 'center',
    x: 320,
    y: 250,
    name: '+1 power',
    description: 'Increase weapon power',
    learned: false,
    available: true,
  },
  {
    id: 'ability',
    previous: 'power',
    x: 320,
    y: 180,
    name: 'Whirlwind',
    description: 'Strike surrounding enemies',
    learned: false,
    available: false,
  },
];
export const Interactive: Story = {
  args: { nodes, points: 2, onLearn: () => {} },
  render: function Example() {
    const [learned, setLearned] = useState(['center']);
    return (
      <TalentTree
        nodes={nodes.map((node) => ({
          ...node,
          learned: learned.includes(node.id),
          available:
            !learned.includes(node.id) &&
            !!node.previous &&
            learned.includes(node.previous) &&
            learned.length < 3,
        }))}
        points={3 - learned.length}
        onLearn={(id) => setLearned([...learned, id])}
      />
    );
  },
};
export const NoPoints: Story = {
  args: {
    nodes: nodes.map((node) => ({ ...node, available: false })),
    points: 0,
    onLearn: () => {},
  },
};
