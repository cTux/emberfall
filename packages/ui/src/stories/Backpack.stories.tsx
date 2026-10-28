import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
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
        subtitle: 'Consumable',
        useAction: 'Use',
        icon: <img src={healthPotion} alt='' />,
      },
    ],
  },
} satisfies Meta<typeof Backpack>;
export default meta;
export const Stacked: StoryObj<typeof meta> = {};
export const Empty: StoryObj<typeof meta> = { args: { items: [] } };
export const Modifiers: StoryObj<typeof meta> = {
  render: function Modifiers(args) {
    const [lastAction, setLastAction] = useState('No action');
    return (
      <>
        <Backpack
          {...args}
          onUse={(id, modifiers) =>
            setLastAction(`${id}: Shift=${modifiers.shiftKey}, Ctrl=${modifiers.ctrlKey}`)
          }
        />
        <output>{lastAction}</output>
      </>
    );
  },
};
export const Storage: StoryObj<typeof meta> = {
  args: { label: 'Storage 1', slots: 40, coins: undefined, action: 'Withdraw' },
};
export const DragAndDrop: StoryObj<typeof meta> = {
  render: function DragAndDrop(args) {
    const [inventories, setInventories] = useState([args.items, [] as typeof args.items]);
    const transfer = (source: number, id: string) => {
      const item = inventories[source].find((entry) => entry.id === id);
      if (!item) return;
      setInventories(
        inventories.map((items, index) =>
          index === source ? items.filter((entry) => entry.id !== id) : [...items, item],
        ),
      );
    };
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
          width: 500,
          maxWidth: '100%',
        }}
      >
        {inventories.map((items, index) => (
          <Backpack
            {...args}
            key={index}
            items={items}
            label={index === 0 ? 'Your backpack' : 'Storage'}
            coins={undefined}
            slots={index === 0 ? 20 : 40}
            inventory={String(index)}
            drop={{ accepts: [String(1 - index)], onDrop: (_, id) => transfer(1 - index, id) }}
            onUse={(id) => transfer(index, id)}
          />
        ))}
      </Box>
    );
  },
};
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
export const Full: StoryObj<typeof meta> = {
  args: {
    items: Array.from({ length: 20 }, (_, index) => ({ ...meta.args.items[0], id: String(index) })),
  },
};
