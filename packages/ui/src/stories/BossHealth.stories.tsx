import type { Meta, StoryObj } from "@storybook/react-vite";
import { BossHealth } from "../index";
const meta = {
  title: "Components/BossHealth",
  component: BossHealth,
  tags: ["autodocs"],
  args: { name: "The Hollow Warden", health: 140, maxHealth: 200 },
} satisfies Meta<typeof BossHealth>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
