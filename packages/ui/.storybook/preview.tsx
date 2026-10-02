import type { Preview } from "@storybook/react-vite";
import { GameUiProvider } from "../src";

const preview: Preview = {
  decorators: [
    (Story) => (
      <GameUiProvider>
        <Story />
      </GameUiProvider>
    ),
  ],
  parameters: {
    layout: "padded",
    a11y: { test: "error" },
    options: { storySort: { order: ["Guide", "Foundations", "Components", "Screens"] } },
  },
};
export default preview;
