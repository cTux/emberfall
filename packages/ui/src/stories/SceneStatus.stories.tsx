import type { Meta, StoryObj } from "@storybook/react-vite";
import { SceneStatus } from "../index";
const meta = {
  title: "Components/SceneStatus",
  component: SceneStatus,
  tags: ["autodocs"],
  args: { label: "Forest", seconds: 94 },
} satisfies Meta<typeof SceneStatus>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
