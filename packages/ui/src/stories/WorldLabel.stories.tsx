import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@mui/material";
import { WorldLabel } from "../index";

const meta = {
  title: "Components/WorldLabel",
  component: WorldLabel,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <Box sx={{ position: "relative", minHeight: 180, m: 3 }}>
        <Story />
      </Box>
    ),
  ],
  args: { text: "Meet me by the forest portal!", kind: "chat" },
} satisfies Meta<typeof WorldLabel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Chat: Story = {};
export const LongChat: Story = {
  args: {
    text: "Привіт! 👋 A very long message and an_unbroken_word_that_must_fit_on_a_narrow_screen_without_overflow.",
  },
};
export const Building: Story = { args: { kind: "badge", text: "Wardrobe", active: true } };
export const Navigation: Story = {
  args: { kind: "navigation", text: "The Hollow Warden", tone: "boss" },
};
