import type { Meta, StoryObj } from "@storybook/react-vite";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons/faShieldHalved";
import { faRing } from "@fortawesome/free-solid-svg-icons/faRing";
import { EquipmentPanel, GameWindow } from "../index";
import type { EquipmentSlotView } from "../index";

const slots: EquipmentSlotView[] = [
  ["Weapon", 1, 2],
  ["Gloves", 1, 3],
  ["Helmet", 2, 1],
  ["Body armor", 2, 2],
  ["Leggings", 2, 3],
  ["Boots", 2, 4],
  ["Amulet", 3, 1],
  ["Off-hand", 3, 2],
  ["Ring", 3, 3],
].map(([label, column, row]) => ({
  id: String(label),
  label: String(label),
  position: { column: Number(column), row: Number(row) },
  fallback: <FontAwesomeIcon icon={label === "Ring" ? faRing : faShieldHalved} />,
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
              icon: <FontAwesomeIcon icon={faShieldHalved} />,
              description: "Physical damage. A forward slash hits each enemy once per swing.",
              stats: [
                { label: "Power", value: "5" },
                { label: "Critical chance", value: "5%" },
              ],
            },
          }
        : slot,
    ),
    stats: [
      { label: "Power", value: "5" },
      { label: "Damage type", value: "Physical" },
      { label: "Attack speed", value: "1.43 / sec" },
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
