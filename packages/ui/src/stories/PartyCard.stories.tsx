import type { Meta, StoryObj } from "@storybook/react-vite";
import { PartyCard } from "../index";
const meta = {
  title: "Components/PartyCard",
  component: PartyCard,
  tags: ["autodocs"],
  args: {
    name: "Astrid",
    level: 1,
    health: 75,
    maxHealth: 100,
    host: true,
    local: true,
  },
} satisfies Meta<typeof PartyCard>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
export const HostAway: StoryObj<typeof meta> = { args: { away: true } };
export const WithCompanion: StoryObj<typeof meta> = {
  args: { companion: { name: "Bear", health: 75, maxHealth: 150, portrait: "🐻" } },
};
export const DefeatedCompanion: StoryObj<typeof meta> = {
  args: { companion: { name: "Bear", health: 0, maxHealth: 150, portrait: "🐻" } },
};
