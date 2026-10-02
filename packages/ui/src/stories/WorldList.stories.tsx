import type { Meta, StoryObj } from "@storybook/react-vite";
import { WorldList } from "../index";
const meta = {
  title: "Components/WorldList",
  component: WorldList,
  tags: ["autodocs"],
  args: {
    worlds: [{ id: "1", name: "Northern grove", players: 3, capacity: 8, locked: true }],
    disabled: false,
    onJoin: () => {},
    onCreate: () => {},
  },
} satisfies Meta<typeof WorldList>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
