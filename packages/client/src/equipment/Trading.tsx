import { useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSackDollar } from '@fortawesome/free-solid-svg-icons/faSackDollar';
import { Backpack, ChapterTabs } from '@emberfall/ui';
import type { ClientMessage, Player } from '@emberfall/common';
import { backpackViews } from './backpack';

export function Trading({
  player,
  merchant,
  craftsman = false,
  send,
}: {
  player: Player;
  merchant: import('@emberfall/common').Merchant;
  craftsman?: boolean;
  send: (message: ClientMessage) => void;
}) {
  const [tab, setTab] = useState('buy');
  const trade = (id: string, buying: boolean, modifiers: { shiftKey: boolean; ctrlKey: boolean }) =>
    send({
      type: 'trade',
      npcId: craftsman ? 'craftsman' : 'innkeeper',
      id,
      buying,
      amount: modifiers.ctrlKey ? 'stack' : modifiers.shiftKey ? 10 : 1,
    });
  return (
    <ChapterTabs
      label='Trader inventory'
      value={tab}
      onChange={setTab}
      showHeading={false}
      chapters={[
        {
          id: 'buy',
          title: 'Buy',
          items: merchant.backpack,
          action: 'Buy',
          label: craftsman ? "Craftsman's backpack" : "Innkeeper's backpack",
        },
        {
          id: 'buyback',
          title: 'Buyback',
          items: merchant.buyback,
          action: 'Buy back',
          label: 'Buyback',
        },
      ].map(({ id, title, items, action, label }) => ({
        id,
        title,
        content: (
          <Box
            sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.5 }}
          >
            <Backpack
              label={label}
              items={backpackViews(items, player)}
              coins={merchant.coins}
              action={action}
              inventory={`vendor-${id}`}
              drop={{
                accepts: ['backpack'],
                onDrop: (_, id, modifiers) => trade(id, false, modifiers),
              }}
              onUse={(id, modifiers) => trade(id, true, modifiers)}
            />
            <Backpack
              label='Your backpack'
              items={backpackViews(player.backpack ?? [], player)}
              coins={player.coins ?? 0}
              action='Sell'
              inventory='backpack'
              drop={{
                accepts: ['vendor-buy', 'vendor-buyback'],
                onDrop: (_, id, modifiers) => trade(id, true, modifiers),
              }}
              headerActions={
                <Tooltip title='Sell all'>
                  <span>
                    <IconButton
                      aria-label='Sell all'
                      disabled={!player.backpack?.length}
                      onClick={() =>
                        send({ type: 'sellAll', npcId: craftsman ? 'craftsman' : 'innkeeper' })
                      }
                      sx={{ color: 'primary.main', fontSize: '0.75rem', p: 0.5 }}
                    >
                      <FontAwesomeIcon icon={faSackDollar} aria-hidden='true' />
                    </IconButton>
                  </span>
                </Tooltip>
              }
              onUse={(id, modifiers) => trade(id, false, modifiers)}
            />
          </Box>
        ),
      }))}
    />
  );
}
