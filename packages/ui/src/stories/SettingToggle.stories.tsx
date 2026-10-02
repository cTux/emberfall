import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingToggle } from "../index";
const meta = {
  title: "Components/SettingToggle",
  component: SettingToggle,
  tags: ["autodocs"],
  args: { label: "Floating damage numbers", checked: true, disabled: false, onChange: () => {} },
} satisfies Meta<typeof SettingToggle>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
