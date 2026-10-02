import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChoiceCard } from "../index";
const meta = {
  title: "Components/ChoiceCard",
  component: ChoiceCard,
  tags: ["autodocs"],
  args: {
    title: "Druid",
    description: "Roots · Bear companion",
    selected: true,
    disabled: false,
    onSelect: () => {},
  },
} satisfies Meta<typeof ChoiceCard>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
