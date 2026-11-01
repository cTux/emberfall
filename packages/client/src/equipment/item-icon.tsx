import { useEffect, useRef } from 'react';
import {
  itemDefinition,
  PLANT_KINDS,
  GEAR_DEFINITIONS,
  EQUIPMENT_SLOTS,
  SLOT_GEAR_TYPES,
} from '@emberfall/core';
import { plantArt, environmentArt } from '../art';
import { resourceScenery } from '../gathering';
import { weaponSrc, itemArtName } from '../class-art';
import { clientAsset } from '../urls.ts';
import { slotViews, ITEM_CLASSES } from './metadata';

// Inventory art is rasterized at the shared 32-pixel tooltip/icon size to avoid unnecessary texture work.
const PLANT_ICON_SIZE = 32;

function PlantIcon({ variant }: { variant: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const image = variant === -1 ? environmentArt : plantArt;
    const draw = () => {
      const { sprite } = resourceScenery({
        id: 'inventory-plant',
        kind: 'plant',
        x: 0,
        y: 0,
        size: PLANT_ICON_SIZE,
        variant: variant === -1 ? undefined : variant,
      });
      const ctx = canvas.current?.getContext('2d');
      ctx?.clearRect(0, 0, PLANT_ICON_SIZE, PLANT_ICON_SIZE);
      ctx?.drawImage(sprite, 0, 0, PLANT_ICON_SIZE, PLANT_ICON_SIZE);
    };

    image.addEventListener('load', draw);
    draw();

    return () => {
      return image.removeEventListener('load', draw);
    };
  }, [variant]);

  return (
    <canvas ref={canvas} width={PLANT_ICON_SIZE} height={PLANT_ICON_SIZE} aria-hidden='true' />
  );
}

export function itemIcon(itemId: string) {
  const art = itemArtName(itemId);

  if (art) {
    return <img src={clientAsset(`/assets/wardrobe-style/${art}.png`)} alt='' />;
  }

  const plantVariant = PLANT_KINDS.findIndex((kind) => {
    return kind === itemId;
  });

  if (plantVariant !== -1 || itemId === 'plant') {
    return <PlantIcon variant={plantVariant} />;
  }

  if (itemDefinition(itemId).kind === 'resource') {
    return <span aria-hidden='true'>◆</span>;
  }

  const gear = GEAR_DEFINITIONS[itemId];
  const itemClass = ITEM_CLASSES[itemId];
  const slot = gear
    ? EQUIPMENT_SLOTS.find((slot) => {
        return SLOT_GEAR_TYPES[slot].includes(gear.gearType);
      })
    : 'amulet';
  const fallback =
    slotViews.find((view) => {
      return view.id === slot;
    })?.icon ?? clientAsset('/assets/wardrobe-style/slot-offHand.png');

  return (
    <img
      src={
        itemId === 'health-potion'
          ? clientAsset('/assets/wardrobe-style/health-potion.png')
          : itemClass
            ? weaponSrc(itemClass)
            : fallback
      }
      alt=''
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(fallback)) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}
