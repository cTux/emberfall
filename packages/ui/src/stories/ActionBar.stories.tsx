import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionBar } from '../index';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBurst } from '@fortawesome/free-solid-svg-icons/faBurst';

const meta = {
  title: 'Components/ActionBar',
  component: ActionBar,
  tags: ['autodocs'],
  args: {
    autoFire: true,
    autoTarget: true,
    baseAbility: {
      name: 'Slash',
      icon: <FontAwesomeIcon icon={faBurst} size='2x' aria-hidden='true' />,
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
export const Manual: Story = { args: { autoFire: false, autoTarget: false } };
export const AutoFireOnly: Story = { args: { autoTarget: false } };
export const AutoTargetOnly: Story = { args: { autoFire: false } };
