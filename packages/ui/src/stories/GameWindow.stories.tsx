import type { Meta, StoryObj } from "@storybook/react-vite";
import { GameWindow } from "../index";
const meta = {
  title: "Components/GameWindow",
  component: GameWindow,
  tags: ["autodocs"],
  args: {
    title: "Forest portal",
    open: true,
    modal: false,
    children: "Drag this title. The host owns open state.",
    onClose: () => {},
  },
} satisfies Meta<typeof GameWindow>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
