import { useState } from 'react';
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
      description: 'Swing your weapon at nearby enemies.',
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
export const FractionalCooldowns: Story = {
  args: {
    baseAbility: { ...meta.args.baseAbility, cooldownMs: 5747.12643678161 },
    abilities: [{ ...meta.args.baseAbility, name: 'Mending Seed', cooldownMs: 5747.12643678161 }],
  },
};
export const Manual: Story = { args: { autoFire: false, autoTarget: false } };
export const AutoFireOnly: Story = { args: { autoTarget: false } };
export const AutoTargetOnly: Story = { args: { autoFire: false } };

export const TalentCooldowns: Story = {
  args: {
    baseAbility: { ...meta.args.baseAbility, remainingMs: 650 },
    abilities: [
      { ...meta.args.baseAbility, name: 'Sweeping strike', cooldownMs: 5000, remainingMs: 5000 },
      { ...meta.args.baseAbility, name: 'Whirlwind', cooldownMs: 10000, remainingMs: 6500 },
      { ...meta.args.baseAbility, name: 'Earthshatter', cooldownMs: 8000, remainingMs: 250 },
      { ...meta.args.baseAbility, name: 'Execution', cooldownMs: 12000, remainingMs: 0 },
    ],
  },
};

export const Interactive: Story = {
  render: function InteractiveActionBar(args) {
    const [autoCast, setAutoCast] = useState(false);
    const [chosen, setChosen] = useState(false);
    return (
      <>
        <ActionBar
          {...args}
          onChoose={() => setChosen(true)}
          abilities={[
            {
              ...meta.args.baseAbility,
              name: 'Whirlwind',
              remainingMs: 5000,
              autoCast,
              onToggleAutoCast: () => setAutoCast((value) => !value),
            },
          ]}
        />
        <div role='status'>{chosen ? 'Picker opened' : 'Picker closed'}</div>
      </>
    );
  },
};
