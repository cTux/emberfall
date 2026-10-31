import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ChapterTabs } from '../index';
const meta = {
  title: 'Components/ChapterTabs',
  component: ChapterTabs,
  tags: ['autodocs'],
  args: {
    label: 'Codex chapters',
    value: 'controls',
    chapters: [
      { id: 'controls', title: 'Controls', content: 'WASD to move. E to interact.' },
      { id: 'combat', title: 'Combat', content: 'Avoid enemy windups.' },
    ],
    onChange: () => {},
  },
} satisfies Meta<typeof ChapterTabs>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
export const Renameable: StoryObj<typeof meta> = {
  render: function Renameable(args) {
    const [title, setTitle] = useState('Storage 1');

    return (
      <ChapterTabs
        {...args}
        value='storage'
        chapters={[
          {
            id: 'storage',
            title,
            content: 'Right-click or press F2 on the tab.',
            onRename: () => setTitle('Renamed storage'),
          },
        ]}
      />
    );
  },
};
