import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConnectionStatus } from "../index";
const meta = {
  title: "Components/ConnectionStatus",
  component: ConnectionStatus,
  tags: ["autodocs"],
  args: { status: "connected" },
} satisfies Meta<typeof ConnectionStatus>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
