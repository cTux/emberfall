import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ChapterTabs, GameWindow } from '../index';
const meta = {
  title: 'Components/GameWindow',
  component: GameWindow,
  tags: ['autodocs'],
  args: {
    title: 'Portal',
    open: true,
    modal: false,
    children: 'Drag this title. The host owns open state.',
    onClose: () => {},
  },
} satisfies Meta<typeof GameWindow>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
export const Tabbed: StoryObj<typeof meta> = {
  args: { height: 420 },
  render: function Tabbed(args) {
    const [value, setValue] = useState('chapter-0');

    return (
      <div>
        <GameWindow {...args} title='Tabbed window' modal>
          <ChapterTabs
            label='Window chapters'
            value={value}
            onChange={setValue}
            chapters={Array.from({ length: 12 }, (_, index) => {
              return {
                id: `chapter-${index}`,
                title: index === 1 ? 'Unavailable' : `Chapter ${index + 1}`,
                disabled: index === 1,
                content: <div style={{ height: 700 }}>Long chapter content</div>,
              };
            })}
          />
        </GameWindow>
      </div>
    );
  },
};
export const TabbedAutoHeight: StoryObj<typeof meta> = {
  ...Tabbed,
  args: { height: undefined },
};
