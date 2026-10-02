import type { Meta, StoryObj } from "@storybook/react-vite";
import { PortalVote } from "../index";
const meta = {
  title: "Components/PortalVote",
  component: PortalVote,
  tags: ["autodocs"],
  args: {
    scene: "Forest",
    difficulty: "Easy",
    ready: 1,
    total: 2,
    voted: false,
    disabled: false,
    onVote: () => {},
  },
} satisfies Meta<typeof PortalVote>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
