import type { Meta, StoryObj } from "@storybook/react-vite";
import weaponSlot from "../assets/item-icons/slot-weapon.png";
import glovesSlot from "../assets/item-icons/slot-gloves.png";
import helmetSlot from "../assets/item-icons/slot-helmet.png";
import bodyArmorSlot from "../assets/item-icons/slot-bodyArmor.png";
import leggingsSlot from "../assets/item-icons/slot-leggings.png";
import bootsSlot from "../assets/item-icons/slot-boots.png";
import amuletSlot from "../assets/item-icons/slot-amulet.png";
import offHandSlot from "../assets/item-icons/slot-offHand.png";
import ringSlot from "../assets/item-icons/slot-ring.png";
import warriorWeapon from "../assets/item-icons/warrior-weapon.png";
import { EquipmentPanel, GameWindow } from "../index";
import type { EquipmentSlotView } from "../index";

const slots: EquipmentSlotView[] = [
  ["Weapon", 1, 2, weaponSlot],
  ["Gloves", 1, 3, glovesSlot],
  ["Helmet", 2, 1, helmetSlot],
  ["Body armor", 2, 2, bodyArmorSlot],
  ["Leggings", 2, 3, leggingsSlot],
  ["Boots", 2, 4, bootsSlot],
  ["Amulet", 3, 1, amuletSlot],
  ["Off-hand", 3, 2, offHandSlot],
  ["Ring", 3, 3, ringSlot],
].map(([label, column, row, image]) => ({
  id: String(label),
  label: String(label),
  position: { column: Number(column), row: Number(row) },
  fallback: <img src={String(image)} alt="" className="equipment-slot-placeholder" />,
  accepts: label === "Off-hand" ? "Shield" : String(label),
}));
const meta = {
  title: "Components/EquipmentPanel",
  component: EquipmentPanel,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <GameWindow title="Equipment" width={600} modal={false} onClose={() => {}}>
        <Story />
      </GameWindow>
    ),
  ],
  args: {
    slots: slots.map((slot) =>
      slot.id === "Weapon"
        ? {
            ...slot,
            item: {
              name: "Warrior's sword",
              icon: <img src={warriorWeapon} alt="" />,
              badges: [
                {
                  label: "Power",
                  icon: "power",
                  value: "5",
                  explanation: "Deal 5 physical damage to each enemy struck, once per swing.",
                },
                {
                  label: "Range",
                  icon: "range",
                  value: "88",
                  explanation: "The sword reaches enemies within 88 units.",
                },
                {
                  label: "Cooldown",
                  icon: "cooldown",
                  value: "1",
                  explanation: "Wait 1 second between attacks.",
                },
                {
                  label: "Damage type",
                  icon: "physical",
                  explanation: "This sword deals physical damage.",
                },
                {
                  label: "Critical chance",
                  icon: "criticalChance",
                  value: "5%",
                  explanation: "Each hit has a 5% chance to critically strike.",
                },
                {
                  label: "Critical damage",
                  icon: "criticalDamage",
                  value: "150%",
                  explanation: "Critical hits deal 150% of normal damage.",
                },
                {
                  label: "Active swing",
                  icon: "duration",
                  value: "0.26",
                  explanation: "The swing remains active for 0.26 seconds.",
                },
                {
                  label: "Bleed",
                  icon: "bleed",
                  explanation:
                    "Hits have a 10% chance to apply Bleed. Each stack deals 1 damage per second for 5 seconds; new stacks refresh the duration.",
                },
              ],
            },
          }
        : slot,
    ),
    stats: [
      { label: "Power", value: "5" },
      { label: "Damage type", value: "Physical" },
      { label: "Cooldown", value: "1 sec" },
      { label: "Range", value: "88 units" },
      { label: "Critical chance", value: "5%" },
      { label: "Critical damage", value: "150%" },
      { label: "Maximum health", value: "100" },
      { label: "Armor", value: "0" },
    ],
  },
} satisfies Meta<typeof EquipmentPanel>;
export default meta;
export const Starter: StoryObj<typeof meta> = {};
export const Empty: StoryObj<typeof meta> = {
  args: { slots, stats: [{ label: "Power", value: "0" }] },
};
