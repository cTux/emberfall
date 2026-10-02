import type { Meta, StoryObj } from "@storybook/react-vite";
import { PerformanceMonitor } from "../index";
const meta = {
  title: "Components/PerformanceMonitor",
  component: PerformanceMonitor,
  tags: ["autodocs"],
  args: {
    samples: [
      { fps: 60, latency: 30 },
      { fps: 59, latency: 40 },
      { fps: 60, latency: 35 },
    ],
    showFps: true,
    showLatency: true,
  },
} satisfies Meta<typeof PerformanceMonitor>;
export default meta;
export const Playground: StoryObj<typeof meta> = {};
