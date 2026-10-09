import { Box } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlask } from "@fortawesome/free-solid-svg-icons/faFlask";
import type { ClientMessage, BackpackItem } from "@emberfall/common-new";
import { itemDefinition, CONSUMABLES } from "@emberfall/common-new";
import { Backpack, EquipmentPanel } from "@emberfall/ui";
import type { EquipmentSlotView, EquipmentStatView, EquipmentBadgeView } from "@emberfall/ui";
import {
  EQUIPMENT_SLOTS,
  SLOT_GEAR_TYPES,
  CLASS_GEAR_TYPES,
  GEAR_DEFINITIONS,
  STARTER_WEAPONS,
  equippedItems,
  characterStats,
  canEquip,
} from "@emberfall/common-new";
import type { EquipmentSlot, GearType, Player, ClassId } from "@emberfall/common-new";
import { ATTACK_DEFINITIONS } from "@emberfall/common-new/definitions/abilities/attacks";
import { PLAYER_DEFINITIONS } from "@emberfall/common-new/definitions/entities/players";
import { AILMENT_DEFINITIONS } from "@emberfall/common-new/definitions/effects/ailments";
import { weaponSrc } from "./combat-assets";

export const SLOT_POSITIONS = {
  weapon: { column: 1, row: 2 },
  gloves: { column: 1, row: 3 },
  helmet: { column: 2, row: 1 },
  bodyArmor: { column: 2, row: 2 },
  leggings: { column: 2, row: 3 },
  boots: { column: 2, row: 4 },
  amulet: { column: 3, row: 1 },
  offHand: { column: 3, row: 2 },
  ring: { column: 3, row: 3 },
} as const satisfies Record<EquipmentSlot, { column: number; row: number }>;
const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: "Weapon",
  gloves: "Gloves",
  helmet: "Helmet",
  bodyArmor: "Body armor",
  leggings: "Leggings",
  boots: "Boots",
  amulet: "Amulet",
  offHand: "Off-hand",
  ring: "Ring",
};
const GEAR_LABELS: Record<GearType, string> = {
  sword: "Sword",
  bow: "Bow",
  fireStaff: "Fire staff",
  natureStaff: "Nature staff",
  gloves: "Gloves",
  helmet: "Helmet",
  bodyArmor: "Body armor",
  leggings: "Leggings",
  boots: "Boots",
  amulet: "Amulet",
  ring: "Ring",
  shield: "Shield",
  quiver: "Quiver",
  orb: "Mage orb",
  natureFocus: "Nature focus",
};
const ITEM_CLASSES = Object.fromEntries(
  Object.entries(STARTER_WEAPONS).map(([id, weapon]) => [weapon, id]),
) as Record<string, ClassId>;
const number = (value: number) =>
  Number.isFinite(value) ? value.toLocaleString("en", { maximumFractionDigits: 2 }) : "—";
const percent = (value: number) => `${number(value * 100)}%`;
const capitalize = (value: string) => value[0].toUpperCase() + value.slice(1);

export function equipmentStatRows(player: Player): EquipmentStatView[] {
  const stats = characterStats(player);
  return [
    { label: "Power", value: number(stats.power) },
    { label: "Damage type", value: stats.hasWeapon ? capitalize(stats.damageType) : "—" },
    { label: "Cooldown", value: `${number(stats.attackIntervalMs / 1000)} sec` },
    {
      label: "Range",
      value: `${number(player.autoTarget === false ? stats.manualRange : stats.range)} units`,
    },
    { label: "Critical chance", value: percent(stats.criticalChance) },
    { label: "Critical damage", value: percent(stats.criticalMultiplier) },
    { label: "Maximum health", value: number(stats.maxHitpoints) },
    { label: "Armor", value: number(stats.armor) },
    { label: "Damage reduction", value: percent(stats.damageReduction) },
  ];
}

function weaponBadges(player: Player, classId: ClassId, weapon: string): EquipmentBadgeView[] {
  const stats = characterStats({ ...player, classId, equipment: { weapon } });
  const { attack, ailment } = PLAYER_DEFINITIONS[classId];
  const range = player.autoTarget === false ? stats.manualRange : stats.range;
  const badges: EquipmentBadgeView[] = [
    {
      label: "Power",
      icon: "power",
      value: number(stats.power),
      explanation:
        attack === "slash"
          ? `Deal ${number(stats.power)} damage to each enemy struck, once per swing, in a forward half-disc.`
          : `Each projectile deals ${number(stats.power)} damage to its target.${attack === "arrow" ? " Arrows pierce and damage every enemy in their path." : ""}`,
    },
    {
      label: "Range",
      icon: "range",
      value: number(range),
      explanation: `Attack range: ${number(range)} units${attack === "slash" ? "." : player.autoTarget === false ? " with cursor aim." : " with auto-target."}`,
    },
    {
      label: "Cooldown",
      icon: "cooldown",
      value: number(stats.attackIntervalMs / 1000),
      explanation: `Wait ${number(stats.attackIntervalMs / 1000)} seconds between attacks.`,
    },
    {
      label: "Damage type",
      icon:
        stats.damageType === "physical"
          ? "physical"
          : stats.damageType === "nature"
            ? "nature"
            : stats.damageType === "fire"
              ? "burn"
              : "poison",
      explanation: `This weapon deals ${stats.damageType} damage.`,
    },
    {
      label: "Critical chance",
      icon: "criticalChance",
      value: percent(stats.criticalChance),
      explanation: `Each hit has a ${percent(stats.criticalChance)} chance to critically strike.`,
    },
    {
      label: "Critical damage",
      icon: "criticalDamage",
      value: percent(stats.criticalMultiplier),
      explanation: `Critical hits deal ${percent(stats.criticalMultiplier)} of normal damage.`,
    },
  ];
  if (attack === "slash") {
    badges.push({
      label: "Active swing",
      icon: "duration",
      value: number(ATTACK_DEFINITIONS.slash.durationMs / 1000),
      explanation: `The swing remains active for ${number(ATTACK_DEFINITIONS.slash.durationMs / 1000)} seconds. Each enemy can be hit once per swing.`,
    });
  } else {
    const definition = ATTACK_DEFINITIONS[attack];
    badges.push({
      label: "Projectiles",
      icon: "projectiles",
      value: number(definition.count),
      explanation: `Fire ${definition.count} projectiles per attack in a small spread.`,
    });
    badges.push({
      label: "Projectile speed",
      icon: "speed",
      value: number(definition.speed),
      explanation: `Projectiles travel at ${definition.speed} units per second.`,
    });
    if (attack === "fireball") {
      const { splashRadius, splashDamage } = ATTACK_DEFINITIONS.fireball;
      badges.push({
        label: "Splash damage",
        icon: "splash",
        value: number(splashDamage),
        explanation: `Fireballs explode on impact, dealing ${splashDamage} damage to other enemies within ${splashRadius} units.`,
      });
    }
  }
  if (ailment === "roots") {
    const duration = AILMENT_DEFINITIONS.roots.durationMs / 1000;
    badges.push({
      label: "Roots",
      icon: "roots",
      explanation: `One projectile bounces up to three times to the nearest unhit living enemy within 250 units of each impact for full power. Roots slow ordinary enemies by 10% for ${duration} seconds with one stack; hits refresh the duration. Bosses are immune to roots.`,
    });
  } else {
    const definition = AILMENT_DEFINITIONS[ailment];
    badges.push({
      label: capitalize(ailment),
      icon: ailment,
      explanation: `Hits have a ${percent(definition.chance)} chance to apply ${capitalize(ailment)}. Each stack deals ${definition.damagePerStack} damage every ${definition.tickMs / 1000} second for ${definition.durationMs / 1000} seconds; new stacks refresh the duration.`,
    });
  }
  return badges;
}
export function Equipment({
  player,
  send,
}: {
  player: Player;
  send(message: ClientMessage): void;
}) {
  const classId = player.classId ?? "warrior";
  const equipment = equippedItems(player);
  const slots: EquipmentSlotView[] = EQUIPMENT_SLOTS.map((id) => {
    const gear = GEAR_DEFINITIONS[equipment[id] ?? ""];
    const itemClass = gear ? ITEM_CLASSES[gear.id] : undefined;
    return {
      id,
      onUnequip: gear ? () => send({ type: "unequip", slot: id }) : undefined,
      label: SLOT_LABELS[id],
      position: SLOT_POSITIONS[id],
      accepts: (SLOT_GEAR_TYPES[id] as readonly GearType[])
        .filter(
          (type) =>
            (id !== "weapon" && id !== "offHand") ||
            (CLASS_GEAR_TYPES[classId] as readonly GearType[]).includes(type),
        )
        .map((type) => GEAR_LABELS[type])
        .join(", "),
      fallback: (
        <img
          src={`/assets/wardrobe-style/slot-${id}.png`}
          alt=""
          className="equipment-slot-placeholder"
          style={{ opacity: 0.6 }}
        />
      ),
      item:
        gear && canEquip(id, gear, classId)
          ? {
              name: gear.name,
              icon: itemIcon(gear.id),
              price: gear.price ?? 1,
              details: gear.stats.armor ? `Armor: ${gear.stats.armor}` : undefined,
              badges: itemClass ? weaponBadges(player, itemClass, gear.id) : [],
            }
          : undefined,
    };
  });
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 1.5 }}>
      <EquipmentPanel slots={slots} stats={equipmentStatRows(player)} />
      <Backpack
        label="Your backpack"
        items={backpackViews(player.backpack ?? [])}
        coins={player.coins ?? 0}
        action="Use"
        onUse={(id) => send({ type: "useItem", id })}
      />
    </Box>
  );
}

function itemIcon(itemId: string) {
  if (itemId === "health-potion") return <FontAwesomeIcon icon={faFlask} />;
  const gear = GEAR_DEFINITIONS[itemId];
  const itemClass = ITEM_CLASSES[itemId];
  const slot = gear
    ? EQUIPMENT_SLOTS.find((slot) =>
        (SLOT_GEAR_TYPES[slot] as readonly string[]).includes(gear.gearType),
      )
    : "amulet";
  const fallback = `/assets/wardrobe-style/slot-${slot ?? "offHand"}.png`;
  return (
    <img
      src={itemClass ? weaponSrc(itemClass) : fallback}
      alt=""
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
      }}
    />
  );
}
export function backpackViews(items: BackpackItem[]) {
  return items.map((item) => {
    const definition = itemDefinition(item.itemId);
    const gear = GEAR_DEFINITIONS[item.itemId];
    const potion = CONSUMABLES[item.itemId as keyof typeof CONSUMABLES];
    return {
      ...item,
      name: definition.name,
      icon: itemIcon(item.itemId),
      price: definition.price ?? 1,
      details: potion
        ? `Restores ${potion.healing} health`
        : gear.stats.armor
          ? `Armor: ${gear.stats.armor}`
          : "Weapon",
    };
  });
}
export function Trading({
  player,
  merchant,
  send,
}: {
  player: Player;
  merchant: import("@emberfall/common-new").Merchant;
  send(message: ClientMessage): void;
}) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 1.5 }}>
      <Backpack
        label="Innkeeper's backpack"
        items={backpackViews(merchant.backpack)}
        coins={merchant.coins}
        action="Buy"
        onUse={(id) => send({ type: "trade", id, buying: true })}
      />
      <Backpack
        label="Your backpack"
        items={backpackViews(player.backpack ?? [])}
        coins={player.coins ?? 0}
        action="Sell"
        onUse={(id) => send({ type: "trade", id, buying: false })}
      />
    </Box>
  );
}
