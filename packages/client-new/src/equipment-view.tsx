import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHelmetSafety } from "@fortawesome/free-solid-svg-icons/faHelmetSafety";
import { faShirt } from "@fortawesome/free-solid-svg-icons/faShirt";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons/faShieldHalved";
import { faRing } from "@fortawesome/free-solid-svg-icons/faRing";
import { EquipmentPanel } from "@emberfall/ui";
import type { EquipmentSlotView, EquipmentStatView } from "@emberfall/ui";
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
import { classDetails } from "./class-details";
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
const FALLBACK_ICONS = {
  gloves: (
    <svg viewBox="0 0 64 64" fill="currentColor">
      <path d="M19 49 10 32c-2-4 3-8 6-4l5 6V13c0-5 7-5 7 0v15h2V7c0-5 7-5 7 0v21h2V11c0-5 7-5 7 0v18h2V18c0-5 7-5 7 0v20c0 6-3 11-7 14H22zM20 54h30v8H20z" />
    </svg>
  ),
  helmet: <FontAwesomeIcon icon={faHelmetSafety} />,
  bodyArmor: <FontAwesomeIcon icon={faShirt} />,
  leggings: (
    <svg viewBox="0 0 64 64" fill="currentColor">
      <path fillRule="evenodd" d="M13 5h38l3 53H37l-5-29-5 29H10zM13 12h17V5h4v7h17v4H13z" />
      <path d="M10 54h17v6H10zM37 54h17v6H37z" />
    </svg>
  ),
  boots: (
    <svg viewBox="0 0 64 64" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 5h27v32l18 8c5 2 7 6 7 11H10zM10 11h27v4H10zM24 22h13v4H24zM24 29h13v4H24zM10 59h52v5H10z"
      />
    </svg>
  ),
  amulet: (
    <svg viewBox="0 0 64 64" fill="currentColor">
      <path
        d="M12 7c0 13 7 22 20 26C45 29 52 20 52 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M28 30h8v9h-8z" />
      <path fillRule="evenodd" d="M32 37 46 47 32 62 18 47zM32 43l6 5-6 7-6-7z" />
    </svg>
  ),
  offHand: <FontAwesomeIcon icon={faShieldHalved} />,
  ring: <FontAwesomeIcon icon={faRing} />,
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
    { label: "Target range", value: `${number(stats.range)} units` },
    { label: "Manual range", value: `${number(stats.manualRange)} units` },
    { label: "Critical chance", value: percent(stats.criticalChance) },
    { label: "Critical damage", value: percent(stats.criticalMultiplier) },
    { label: "Maximum health", value: number(stats.maxHitpoints) },
    { label: "Maximum mana", value: number(stats.maxManapoints) },
    { label: "Armor", value: number(stats.armor) },
    { label: "Damage reduction", value: percent(stats.damageReduction) },
  ];
}
export function Equipment({ player }: { player: Player }) {
  const classId = player.classId ?? "warrior";
  const equipment = equippedItems(player);
  const slots: EquipmentSlotView[] = EQUIPMENT_SLOTS.map((id) => {
    const gear = GEAR_DEFINITIONS[equipment[id] ?? ""];
    const itemClass = gear ? ITEM_CLASSES[gear.id] : undefined;
    const attack = itemClass ? PLAYER_DEFINITIONS[itemClass].attack : undefined;
    const stats =
      gear && itemClass
        ? equipmentStatRows({
            ...player,
            classId: itemClass,
            equipment: { weapon: gear.id },
          }).slice(0, 7)
        : [];
    if (attack && attack !== "slash") {
      stats.push({ label: "Projectiles", value: number(ATTACK_DEFINITIONS[attack].count) });
      stats.push({
        label: "Projectile speed",
        value: `${ATTACK_DEFINITIONS[attack].speed} units / sec`,
      });
    }
    return {
      id,
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
      fallback: id === "weapon" ? <img src={weaponSrc(classId)} alt="" /> : FALLBACK_ICONS[id],
      item:
        gear && canEquip(id, gear, classId)
          ? {
              name: gear.name,
              icon: <img src={weaponSrc(itemClass ?? classId)} alt="" />,
              description: classDetails[itemClass ?? classId].spellDescription,
              stats,
            }
          : undefined,
    };
  });
  return <EquipmentPanel slots={slots} stats={equipmentStatRows(player)} />;
}
