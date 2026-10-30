import { clientAsset } from './urls.ts';
import { registeredSlotViews, additionalStatViews } from './content-views';
import { game, itemRarity, rarityColor, ItemStat, itemStatWeight } from '@emberfall/core';
import { useEffect, useRef, useState } from 'react';
import { plantArt, environmentArt } from './art';
import { resourceScenery } from './gathering';
import { Box, IconButton, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSackDollar } from '@fortawesome/free-solid-svg-icons/faSackDollar';
import type { ClientMessage, BackpackItem } from '@emberfall/common';
import { itemDefinition, CONSUMABLES, PLANT_KINDS } from '@emberfall/core';
import { Backpack, ChapterTabs, EquipmentPanel } from '@emberfall/ui';
import type { EquipmentSlotView, EquipmentStatView, EquipmentBadgeView } from '@emberfall/ui';
import {
  EQUIPMENT_SLOTS,
  SLOT_GEAR_TYPES,
  CLASS_GEAR_TYPES,
  GEAR_DEFINITIONS,
  STARTER_WEAPONS,
  equippedItems,
  characterStats,
  canEquip,
} from '@emberfall/core';
import type { GearType, Player, ClassId } from '@emberfall/common';
import { ATTACK_DEFINITIONS } from '@emberfall/core/definitions/abilities/attacks';
import { PLAYER_DEFINITIONS } from '@emberfall/core/definitions/entities/players';
import { AILMENT_DEFINITIONS } from '@emberfall/core/definitions/effects/ailments';
import { weaponSrc, itemArtName } from './class-art';

const slotViews = registeredSlotViews();
export const SLOT_POSITIONS = Object.fromEntries(slotViews.map((slot) => [slot.id, slot.position]));
const SLOT_LABELS = Object.fromEntries(
  game.registries.slots.values().map((slot) => [slot.id, slot.label]),
);
const GEAR_LABELS = Object.fromEntries(
  game.registries.gearTypes.values().map((type) => [type.id, type.label]),
);
const ITEM_CLASSES = Object.fromEntries(
  Object.entries(STARTER_WEAPONS).map(([id, weapon]) => [weapon, id]),
) as Record<string, ClassId>;
const number = (value: number) =>
  Number.isFinite(value) ? value.toLocaleString('en', { maximumFractionDigits: 2 }) : '—';
const percent = (value: number) => `${number(value * 100)}%`;
const capitalize = (value: string) => value[0].toUpperCase() + value.slice(1);

export function equipmentStatRows(player: Player): EquipmentStatView[] {
  const stats = characterStats(player);
  return [
    { label: 'Power', value: number(stats.power) },
    { label: 'Damage type', value: stats.hasWeapon ? capitalize(stats.damageType) : '—' },
    { label: 'Cooldown', value: `${number(stats.attackIntervalMs / 1000)} sec` },
    {
      label: 'Range',
      value: `${number(player.autoTarget === false ? stats.manualRange : stats.range)} units`,
    },
    { label: 'Critical chance', value: percent(stats.criticalChance) },
    { label: 'Critical damage', value: percent(stats.criticalMultiplier) },
    { label: 'Maximum health', value: number(stats.maxHitpoints) },
    { label: 'Armor', value: number(stats.armor) },
    { label: 'Damage reduction', value: percent(stats.damageReduction) },
    ...Object.entries(stats.bonuses)
      .filter(([, value]) => value > 0)
      .map(([stat, value]) => ({
        label: `Bonus ${stat.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
        value: `${number(value)}${[ItemStat.Power, ItemStat.Armor, ItemStat.MaximumHealth].includes(stat as typeof ItemStat.Power) || itemStatWeight[stat as ItemStat] < 1 ? '' : '%'}`,
      })),
    ...additionalStatViews(player),
  ];
}

function weaponBadges(
  player: Pick<Player, 'autoTarget'>,
  classId: ClassId,
  weapon: string,
): EquipmentBadgeView[] {
  const stats = characterStats({ classId, equipment: { weapon } });
  const { attack: abilityId, ailment } = PLAYER_DEFINITIONS[classId];
  const attack = ATTACK_DEFINITIONS[abilityId].kind;
  const range = player.autoTarget === false ? stats.manualRange : stats.range;
  const badges: EquipmentBadgeView[] = [
    {
      label: 'Power',
      icon: 'power',
      value: number(stats.power),
      explanation:
        attack === 'slash'
          ? `Deal ${number(stats.power)} damage to each enemy struck, once per swing, in a forward half-disc.`
          : `Each projectile deals ${number(stats.power)} damage to its target.${attack === 'arrow' ? ' Base arrows penetrate three targets after the first hit.' : ''}`,
    },
    {
      label: 'Range',
      icon: 'range',
      value: `${number(range)} units`,
      explanation: `Attack range: ${number(range)} units${attack === 'slash' ? '.' : player.autoTarget === false ? ' with cursor aim.' : ' with auto-target.'}`,
    },
    {
      label: 'Cooldown',
      icon: 'cooldown',
      value: `${number(stats.attackIntervalMs / 1000)} sec`,
      explanation: `Wait ${number(stats.attackIntervalMs / 1000)} seconds between attacks.`,
    },
    {
      label: 'Damage type',
      value: capitalize(stats.damageType),
      icon:
        stats.damageType === 'physical'
          ? 'physical'
          : stats.damageType === 'nature'
            ? 'nature'
            : stats.damageType === 'fire'
              ? 'burn'
              : 'poison',
      explanation: `This weapon deals ${stats.damageType} damage.`,
    },
    {
      label: 'Critical chance',
      icon: 'criticalChance',
      value: percent(stats.criticalChance),
      explanation: `Each hit has a ${percent(stats.criticalChance)} chance to critically strike.`,
    },
    {
      label: 'Critical damage',
      icon: 'criticalDamage',
      value: percent(stats.criticalMultiplier),
      explanation: `Critical hits deal ${percent(stats.criticalMultiplier)} of normal damage.`,
    },
  ];
  if (attack === 'slash') {
    badges.push({
      label: 'Active swing',
      icon: 'duration',
      value: `${number(ATTACK_DEFINITIONS.slash.durationMs / 1000)} sec`,
      explanation: `The swing remains active for ${number(ATTACK_DEFINITIONS.slash.durationMs / 1000)} seconds. Each enemy can be hit once per swing.`,
    });
  } else {
    const definition = ATTACK_DEFINITIONS[attack];
    badges.push({
      label: 'Projectiles',
      icon: 'projectiles',
      value: number(definition.count),
      explanation: `Fire ${definition.count} projectiles per attack in a small spread.`,
    });
    badges.push({
      label: 'Projectile speed',
      icon: 'speed',
      value: `${number(definition.speed)} units/sec`,
      explanation: `Projectiles travel at ${definition.speed} units per second.`,
    });
    if (attack === 'fireball') {
      const { splashRadius, splashDamage } = ATTACK_DEFINITIONS.fireball;
      badges.push({
        label: 'Splash damage',
        icon: 'splash',
        value: number(splashDamage),
        explanation: `Fireballs explode on impact, dealing ${splashDamage} damage to other enemies within ${splashRadius} units.`,
      });
    }
  }
  if (ailment === 'roots') {
    const duration = AILMENT_DEFINITIONS.roots.durationMs / 1000;
    badges.push({
      label: 'Roots',
      icon: 'roots',
      explanation: `One projectile bounces up to three times to the nearest unhit living enemy within 250 units of each impact for full power. Roots slow ordinary enemies by 10% for ${duration} seconds with one stack; hits refresh the duration. Bosses are immune to roots.`,
    });
  } else if (ailment === 'bleed' || ailment === 'poison' || ailment === 'burn') {
    const definition = AILMENT_DEFINITIONS[ailment];
    badges.push({
      label: capitalize(ailment),
      icon: ailment,
      explanation: `Hits have a ${percent(definition.chance)} chance to apply ${capitalize(ailment)}. Each stack deals ${definition.damagePerStack} damage every ${definition.tickMs / 1000} second for ${definition.durationMs / 1000} seconds; new stacks refresh the duration.`,
    });
  }
  return badges;
}
function rolledBadges(item?: Pick<BackpackItem, 'stats'>): EquipmentBadgeView[] {
  return Object.entries(item?.stats ?? {}).map(([stat, value]) => {
    const label = `Bonus ${stat.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
    const flat =
      stat === ItemStat.Power ||
      stat === ItemStat.Armor ||
      stat === ItemStat.MaximumHealth ||
      itemStatWeight[stat as ItemStat] < 1;
    return {
      label,
      icon: 'magic',
      value: `+${number(value)}${flat ? '' : '%'}`,
      explanation:
        stat === ItemStat.GoldIncrease || stat === ItemStat.ExpIncrease
          ? "Adds to the whole party's chance for additional drops. Each full 100% guarantees an extra copy."
          : `${label}: +${number(value)}${flat ? '' : '%'}. Equipped bonuses add together.`,
    };
  });
}
export function Equipment({
  player,
  send,
}: {
  player: Player;
  send: (message: ClientMessage) => void;
}) {
  const classId = player.classId ?? 'warrior';
  const equipment = equippedItems(player);
  const slots: EquipmentSlotView[] = EQUIPMENT_SLOTS.map((id) => {
    const gear = GEAR_DEFINITIONS[equipment[id] ?? ''];
    const itemClass = gear ? ITEM_CLASSES[gear.id] : undefined;
    const instance = player.equipmentItems?.[id];
    return {
      id,
      onUnequip: gear ? () => send({ type: 'unequip', slot: id }) : undefined,
      drop: {
        accepts: ['backpack'],
        onDrop: (_, itemId) => {
          const item = player.backpack?.find((item) => item.id === itemId);
          const definition = item && GEAR_DEFINITIONS[item.itemId];
          if (definition && canEquip(id, definition, classId))
            send({ type: 'useItem', id: itemId });
        },
      },
      label: SLOT_LABELS[id],
      position: SLOT_POSITIONS[id],
      accepts: (SLOT_GEAR_TYPES[id] as readonly GearType[])
        .filter(
          (type) =>
            !game.registries.slots.require(id).classRestricted ||
            (CLASS_GEAR_TYPES[classId] as readonly GearType[]).includes(type),
        )
        .map((type) => GEAR_LABELS[type])
        .join(', '),
      fallback: (
        <img
          src={slotViews.find((slot) => slot.id === id)!.icon}
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
              price: gear.price ?? 1,
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
      <EquipmentPanel slots={slots} stats={equipmentStatRows(player)} />
      <Backpack
        label='Your backpack'
        items={backpackViews(player.backpack ?? [], player)}
        coins={player.coins ?? 0}
        action='Use'
        inventory='backpack'
        onUse={(id) => send({ type: 'useItem', id })}
      />
    </Box>
  );
}

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
        size: 32,
        variant: variant === -1 ? undefined : variant,
      });
      const ctx = canvas.current?.getContext('2d');
      ctx?.clearRect(0, 0, 32, 32);
      ctx?.drawImage(sprite, 0, 0, 32, 32);
    };
    image.addEventListener('load', draw);
    draw();
    return () => image.removeEventListener('load', draw);
  }, [variant]);
  return <canvas ref={canvas} width={32} height={32} aria-hidden='true' />;
}

function itemIcon(itemId: string) {
  const art = itemArtName(itemId);
  if (art) return <img src={clientAsset(`/assets/wardrobe-style/${art}.png`)} alt='' />;
  const plantVariant = PLANT_KINDS.findIndex((kind) => kind === itemId);
  if (plantVariant !== -1 || itemId === 'plant') return <PlantIcon variant={plantVariant} />;
  if (itemDefinition(itemId).kind === 'resource') return <span aria-hidden='true'>◆</span>;
  const gear = GEAR_DEFINITIONS[itemId];
  const itemClass = ITEM_CLASSES[itemId];
  const slot = gear
    ? EQUIPMENT_SLOTS.find((slot) =>
        (SLOT_GEAR_TYPES[slot] as readonly string[]).includes(gear.gearType),
      )
    : 'amulet';
  const fallback =
    slotViews.find((view) => view.id === slot)?.icon ??
    clientAsset('/assets/wardrobe-style/slot-offHand.png');
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
        if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
      }}
    />
  );
}
export function backpackViews(items: BackpackItem[], player: Pick<Player, 'autoTarget'>) {
  return items.map((item) => {
    const definition = itemDefinition(item.itemId);
    const gear = GEAR_DEFINITIONS[item.itemId];
    const potion = CONSUMABLES[item.itemId as keyof typeof CONSUMABLES];
    return {
      ...item,
      name: definition.name,
      rarity: capitalize(itemRarity(item)),
      rarityColor: rarityColor[itemRarity(item)],
      icon: itemIcon(item.itemId),
      price: definition.price ?? 1,
      subtitle: gear ? GEAR_LABELS[gear.gearType] : capitalize(definition.kind),
      primary: gear?.stats.armor ? { label: 'Armor', value: number(gear.stats.armor) } : undefined,
      stats: [
        ...(gear && ITEM_CLASSES[item.itemId]
          ? weaponBadges(player, ITEM_CLASSES[item.itemId], gear.id)
          : []),
        ...rolledBadges(item),
      ],
      useAction: gear ? 'Equip' : potion ? 'Use' : undefined,
      details: potion ? `Restores ${potion.healing} health` : '',
    };
  });
}
export function Trading({
  player,
  merchant,
  send,
}: {
  player: Player;
  merchant: import('@emberfall/common').Merchant;
  send: (message: ClientMessage) => void;
}) {
  const [tab, setTab] = useState('buy');
  const trade = (id: string, buying: boolean, modifiers: { shiftKey: boolean; ctrlKey: boolean }) =>
    send({
      type: 'trade',
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
          label: "Innkeeper's backpack",
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
                      onClick={() => send({ type: 'sellAll' })}
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
