import type { Meta, StoryObj } from "@storybook/react-vite";
import { InteractionPrompt } from "../index";
const meta = {
  title: "Components/InteractionPrompt",
  component: InteractionPrompt,
  tags: ["autodocs"],
  args: { action: "Enter forest portal", keys: "E" },
} satisfies Meta<typeof InteractionPrompt>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
