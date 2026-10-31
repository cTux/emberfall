import { useState } from 'react';
import { Box } from '@mui/material';
import { Backpack, ChapterTabs, EquipmentPanel } from '@emberfall/ui';
import type { EquipmentSlotView } from '@emberfall/ui';
import {
  game,
  itemRarity,
  rarityColor,
  itemPrice,
  EQUIPMENT_SLOTS,
  SLOT_GEAR_TYPES,
  CLASS_GEAR_TYPES,
  GEAR_DEFINITIONS,
  equippedItems,
  canEquip,
} from '@emberfall/core';
import type { ClientMessage, Player } from '@emberfall/common';
import {
  slotViews,
  SLOT_POSITIONS,
  SLOT_LABELS,
  GEAR_LABELS,
  ITEM_CLASSES,
  number,
  capitalize,
} from './equipment/metadata';
import { equipmentStatRows } from './equipment/stats';
import { weaponBadges, rolledBadges } from './equipment/badges';
import { itemIcon } from './equipment/item-icon';
import { backpackViews } from './equipment/backpack';

export { SLOT_POSITIONS } from './equipment/metadata';
export { equipmentStatRows } from './equipment/stats';
export { backpackViews } from './equipment/backpack';
export { Trading } from './equipment/Trading';

export function Equipment({
  player,
  send,
}: {
  player: Player;
  send: (message: ClientMessage) => void;
}) {
  const [tab, setTab] = useState('equipment');
  const classId = player.classId ?? 'warrior';
  const equipment = equippedItems(player);
  const slots: EquipmentSlotView[] = EQUIPMENT_SLOTS.map((id) => {
    const gear = GEAR_DEFINITIONS[equipment[id] ?? ''];
    const itemClass = gear ? ITEM_CLASSES[gear.id] : undefined;
    const instance = player.equipmentItems?.[id];

    return {
      id,
      onUnequip: gear
        ? () => {
            return send({ type: 'unequip', slot: id });
          }
        : undefined,
      drop: {
        accepts: ['backpack'],
        onDrop: (_, itemId) => {
          const item = player.backpack?.find((item) => {
            return item.id === itemId;
          });
          const definition = item && GEAR_DEFINITIONS[item.itemId];
          if (definition && canEquip(id, definition, classId)) {
            send({ type: 'useItem', id: itemId });
          }
        },
      },
      label: SLOT_LABELS[id],
      position: SLOT_POSITIONS[id],
      accepts: SLOT_GEAR_TYPES[id]
        .filter((type) => {
          return (
            !game.registries.slots.require(id).classRestricted ||
            CLASS_GEAR_TYPES[classId].includes(type)
          );
        })
        .map((type) => {
          return GEAR_LABELS[type];
        })
        .join(', '),
      fallback: (
        <img
          src={
            slotViews.find((slot) => {
              return slot.id === id;
            })!.icon
          }
          alt=''
          className='equipment-slot-placeholder'
          style={{ opacity: 0.6 }}
        />
      ),
      item:
        gear && canEquip(id, gear, classId)
          ? {
              name: gear.name,
              rarity: capitalize(itemRarity(instance)),
              rarityColor: rarityColor[itemRarity(instance)],
              icon: itemIcon(gear.id),
              price: itemPrice(instance ?? { itemId: gear.id }),
              subtitle: GEAR_LABELS[gear.gearType],
              primary: gear.stats.armor
                ? { label: 'Armor', value: number(gear.stats.armor) }
                : undefined,
              badges: [
                ...(itemClass ? weaponBadges(player, itemClass, gear.id) : []),
                ...rolledBadges(instance),
              ],
            }
          : undefined,
    };
  });

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.5 }}>
      <ChapterTabs
        label='Inventory'
        value={tab}
        onChange={setTab}
        showHeading={false}
        chapters={[
          {
            id: 'equipment',
            title: 'Equipment',
            content: <EquipmentPanel slots={slots} stats={[]} />,
          },
          {
            id: 'stats',
            title: 'Stats',
            content: <EquipmentPanel slots={[]} stats={equipmentStatRows(player)} />,
          },
        ]}
      />
      <Backpack
        label='Your backpack'
        items={backpackViews(player.backpack ?? [], player)}
        coins={player.coins ?? 0}
        action='Use'
        inventory='backpack'
        onUse={(id) => {
          return send({ type: 'useItem', id });
        }}
      />
    </Box>
  );
}
