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
    size: 22,
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
    size: 34,
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

export const Branching: Story = {
  args: {
    points: 7,
    onLearn: () => {},
    nodes: [
      {
        id: 'origin',
        previous: null,
        x: 400,
        y: 350,
        size: 22,
        name: 'Origin',
        description: 'Origin',
        learned: true,
        available: false,
      },
      ...[
        ['a', 'origin', 330, 275],
        ['b', 'a', 220, 260],
        ['c', 'b', 160, 155],
        ['d', 'a', 350, 165],
        ['e', 'd', 440, 100],
        ['f', 'b', 140, 350],
        ['g', 'origin', 500, 400],
        ['h', 'g', 560, 520],
        ['i', 'g', 630, 335],
        ['j', 'origin', 310, 440],
        ['k', 'j', 200, 490],
        ['l', 'j', 350, 550],
      ].map(([id, previous, x, y]) => ({
        id: String(id),
        previous: String(previous),
        x: Number(x),
        y: Number(y),
        name: `Power ${id}`,
        description: '+1 power',
        learned: ['a', 'b'].includes(String(id)),
        available: ['d', 'f', 'g', 'j'].includes(String(id)),
      })),
      {
        id: 'spell',
        previous: 'c',
        x: 80,
        y: 100,
        size: 34,
        name: 'Sweeping strike',
        description: '2× power',
        learned: false,
        available: false,
      },
    ],
  },
};
