import type { Meta, StoryObj } from "@storybook/react-vite";
import { PartyCard } from "../index";
const meta = {
  title: "Components/PartyCard",
  component: PartyCard,
  tags: ["autodocs"],
  args: {
    name: "Astrid",
    level: 1,
    health: 75,
    maxHealth: 100,
    mana: 35,
    maxMana: 50,
    host: true,
    local: true,
  },
} satisfies Meta<typeof PartyCard>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
