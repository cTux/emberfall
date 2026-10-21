import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionBar } from '../index';
import sword from '../assets/item-icons/warrior-weapon.png';

const meta = {
  title: 'Components/ActionBar',
  component: ActionBar,
  tags: ['autodocs'],
  args: {
    baseAbility: {
      name: 'Slash',
      icon: <img src={sword} alt='' draggable={false} />,
      cooldownMs: 1000,
      remainingMs: 0,
    },
  },
} satisfies Meta<typeof ActionBar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const CoolingDown: Story = {
  args: { baseAbility: { ...meta.args.baseAbility, remainingMs: 650 } },
};
export const Unequipped: Story = { args: { baseAbility: undefined } };
