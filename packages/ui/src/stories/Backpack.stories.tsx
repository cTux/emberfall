import { BackpackTransferDemo } from './backpack-transfer-demo';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSackDollar } from '@fortawesome/free-solid-svg-icons/faSackDollar';
import healthPotion from '../assets/health-potion.png';
import amulet from '../assets/item-icons/slot-amulet.png';
import warriorWeapon from '../assets/item-icons/warrior-weapon.png';
import { Backpack, EquipmentPanel, GameWindow } from '../index';

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
        stackable: true,
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
export const Single: StoryObj<typeof meta> = {
  args: { items: [{ ...meta.args.items[0], quantity: 1 }] },
};
export const Empty: StoryObj<typeof meta> = { args: { items: [] } };
export const Comparison: StoryObj<typeof meta> = {
  args: {
    items: [
      {
        id: 'amulet',
        name: 'Amulet',
        quantity: 1,
        stackable: false,
        price: 1,
        details: '',
        subtitle: 'Amulet',
        rarity: 'Rare',
        useAction: 'Equip',
        icon: <img src={amulet} alt='' />,
        primary: { label: 'Armor', value: '1' },
        stats: [
          {
            label: 'Exp increase',
            icon: 'magic',
            value: '+20%',
            explanation: 'Adds to party drops.',
          },
        ],
        comparison: {
          rows: [
            { label: 'Exp increase', value: '+20%', improved: true },
            { label: 'Gold increase', value: '-10%', improved: false },
          ],
        },
      },
    ],
  },
};
export const SameStats: StoryObj<typeof meta> = {
  args: {
    items: [{ ...Comparison.args!.items![0], comparison: { rows: [] } }],
  },
};
export const RepeatedStats: StoryObj<typeof meta> = {
  args: {
    items: [
      {
        ...Comparison.args!.items![0],
        comparison: undefined,
        stats: [
          { label: 'Power', icon: 'power', value: '5', explanation: 'Base weapon power.' },
          { label: 'Power', icon: 'magic', value: '+2', explanation: 'Additional rolled power.' },
        ],
      },
    ],
  },
};
export const RestrictedGear: StoryObj<typeof meta> = {
  args: {
    items: [
      {
        id: 'sword',
        stackable: false,
        name: "Warrior's sword",
        quantity: 1,
        price: 1,
        details: '',
        subtitle: 'Sword',
        equipRestriction: 'Your class cannot equip this item.',
        icon: <img src={warriorWeapon} alt='' />,
      },
    ],
  },
};
export const InventoryStats: StoryObj<typeof meta> = {
  render: function InventoryStats(args) {
    const [extraStats, setExtraStats] = useState(false);

    return (
      <>
        <Button
          onClick={() => {
            return setExtraStats(!extraStats);
          }}
        >
          Toggle extra stats
        </Button>
        <GameWindow title='Inventory' width={520} height={300} modal={false} onClose={() => {}}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: 1.5,
            }}
          >
            <EquipmentPanel
              slots={[]}
              stats={[
                { label: 'Armor', value: '9.4' },
                ...(extraStats
                  ? Array.from({ length: 15 }, (_, index) => {
                      return {
                        label: `Bonus stat ${index + 1}`,
                        value: '14%',
                      };
                    })
                  : []),
              ]}
            />
            <Backpack {...args} />
          </Box>
        </GameWindow>
      </>
    );
  },
};
export const Modifiers: StoryObj<typeof meta> = {
  render: function Modifiers(args) {
    const [lastAction, setLastAction] = useState('No action');

    return (
      <>
        <Backpack
          {...args}
          onUse={(id, modifiers) => {
            return setLastAction(`${id}: Shift=${modifiers.shiftKey}, Ctrl=${modifiers.ctrlKey}`);
          }}
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
  render: BackpackTransferDemo,
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
                onClick={() => {
                  return setItems([]);
                }}
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
    items: Array.from({ length: 20 }, (_, index) => {
      return { ...meta.args.items[0], id: String(index) };
    }),
  },
};
