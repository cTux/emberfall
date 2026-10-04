import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { WorldList } from "../index";
const meta = {
  title: "Components/WorldList",
  component: WorldList,
  tags: ["autodocs"],
  args: {
    worlds: [{ id: "1", name: "Northern grove", players: 3, capacity: 8, locked: true }],
    disabled: false,
    onJoin: () => {},
    latency: 42,
  },
} satisfies Meta<typeof WorldList>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};

export const RowInteraction: StoryObj<typeof meta> = {
  render: function RowInteraction(args) {
    const [joins, setJoins] = useState(0);
    return (
      <>
        <WorldList {...args} onJoin={() => setJoins((count) => count + 1)} />
        <p role="status">Joins: {joins}</p>
      </>
    );
  },
  args: {
    worlds: [
      { id: "open", name: "Northern grove", players: 3, capacity: 8, locked: true },
      { id: "full", name: "Full world", players: 8, capacity: 8 },
    ],
  },
};

export const Disabled: StoryObj<typeof meta> = {
  ...RowInteraction,
  args: { ...RowInteraction.args, disabled: true },
};

export const Empty: StoryObj<typeof meta> = { args: { worlds: [] } };
export const Full: StoryObj<typeof meta> = {
  args: {
    worlds: [{ id: "1", name: "Playtest Default", players: 32, capacity: 32 }],
    latency: null,
  },
};
