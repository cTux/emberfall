import type { Meta, StoryObj } from "@storybook/react-vite";
import { VolumeControl } from "../index";
const meta = {
  title: "Components/VolumeControl",
  component: VolumeControl,
  tags: ["autodocs"],
  args: { label: "Effects volume", value: 0.6, disabled: false, onChange: () => {} },
} satisfies Meta<typeof VolumeControl>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
