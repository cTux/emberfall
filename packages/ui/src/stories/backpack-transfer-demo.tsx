import { useState, type ComponentProps } from 'react';
import { Box } from '@mui/material';
import { Backpack } from '../index';
export function BackpackTransferDemo(args: ComponentProps<typeof Backpack>) {
  const [inventories, setInventories] = useState([args.items, [] as typeof args.items]);
  const transfer = (source: number, id: string) => {
    const item = inventories[source].find((entry) => {
      return entry.id === id;
    });

    if (!item) {
      return;
    }

    setInventories(
      inventories.map((items, index) => {
        return index === source
          ? items.filter((entry) => {
              return entry.id !== id;
            })
          : [...items, item];
      }),
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
      {inventories.map((items, index) => {
        return (
          <Backpack
            {...args}
            key={index}
            items={items}
            label={index === 0 ? 'Your backpack' : 'Storage'}
            coins={undefined}
            slots={index === 0 ? 20 : 40}
            inventory={String(index)}
            drop={{
              accepts: [String(1 - index)],
              onDrop: (_, id) => {
                return transfer(1 - index, id);
              },
            }}
            onUse={(id) => {
              return transfer(index, id);
            }}
          />
        );
      })}
    </Box>
  );
}
