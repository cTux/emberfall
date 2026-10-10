import type { Meta, StoryObj } from "@storybook/react-vite";
import healthPotion from "../assets/health-potion.png";
import { Backpack } from "../index";

const meta = {
  title: "Components/Backpack",
  component: Backpack,
  args: {
    label: "Your backpack",
    coins: 5000,
    action: "Use",
    onUse: () => {},
    items: [
      {
        id: "potion",
        name: "Health potion",
        quantity: 5,
        price: 1,
        details: "Restores 25 health",
        icon: <img src={healthPotion} alt="" />,
      },
    ],
  },
} satisfies Meta<typeof Backpack>;
export default meta;
export const Stacked: StoryObj<typeof meta> = {};
export const Empty: StoryObj<typeof meta> = { args: { items: [] } };
export const Unlimited: StoryObj<typeof meta> = {
  args: {
    items: Array.from({ length: 80 }, (_, index) => ({ ...meta.args.items[0], id: String(index) })),
  },
};
