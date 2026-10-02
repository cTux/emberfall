import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
  staticDirs: ["../public"],
  viteFinal: (config) =>
    mergeConfig(config, {
      build: {
        // Storybook's docs and accessibility tooling exceed Vite's app default.
        chunkSizeWarningLimit: 1500,
        rolldownOptions: {
          // Storybook runs entirely in the browser, so RSC directives do not apply.
          checks: { moduleLevelDirective: false },
        },
      },
    }),
};
export default config;
