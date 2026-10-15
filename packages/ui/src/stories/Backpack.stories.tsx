import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSackDollar } from '@fortawesome/free-solid-svg-icons/faSackDollar';
import healthPotion from '../assets/health-potion.png';
import { Backpack } from '../index';

const meta = {
  title: 'Components/Backpack',
  component: Backpack,
  args: {
    label: 'Your backpack',
    coins: 5000,
    action: 'Use',
    onUse: () => {},
    items: [
      {
        id: 'potion',
        name: 'Health potion',
        quantity: 5,
        price: 1,
        details: 'Restores 25 health',
        icon: <img src={healthPotion} alt='' />,
      },
    ],
  },
} satisfies Meta<typeof Backpack>;
export default meta;
export const Stacked: StoryObj<typeof meta> = {};
export const Empty: StoryObj<typeof meta> = { args: { items: [] } };
export const Selling: StoryObj<typeof meta> = {
  render: function Selling(args) {
    const [items, setItems] = useState(args.items);
    return (
      <Backpack
        {...args}
        items={items}
        headerActions={
          <Tooltip title='Sell all'>
            <span>
              <IconButton
                aria-label='Sell all'
                disabled={!items.length}
                onClick={() => setItems([])}
                sx={{ color: 'primary.main', fontSize: '0.75rem', p: 0.5 }}
              >
                <FontAwesomeIcon icon={faSackDollar} aria-hidden='true' />
              </IconButton>
            </span>
          </Tooltip>
        }
      />
    );
  },
};
export const Unlimited: StoryObj<typeof meta> = {
  args: {
    items: Array.from({ length: 80 }, (_, index) => ({ ...meta.args.items[0], id: String(index) })),
  },
};
