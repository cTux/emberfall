import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusMeter } from "../index";
const meta = {
  title: "Components/StatusMeter",
  component: StatusMeter,
  tags: ["autodocs"],
  args: { label: "Health", value: 75, max: 100, color: "success" },
} satisfies Meta<typeof StatusMeter>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
