import type { Meta, StoryObj } from '@storybook/react-vite';
import { PerformanceMonitor } from '../index';
const meta = {
  title: 'Components/PerformanceMonitor',
  component: PerformanceMonitor,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 224 }}>
        <Story />
      </div>
    ),
  ],
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
export const NetworkDiagnostics: StoryObj<typeof meta> = {
  args: {
    samples: Array.from({ length: 60 }, (_, index) => ({
      fps: 232 + (index % 5) * 3,
      latency: 8 + (index % 7),
      inputDelay: 85 + (index % 4) * 12,
      snapshotAge: 95 + (index % 6) * 10,
    })),
  },
};
export const FpsOnly: StoryObj<typeof meta> = { args: { showLatency: false } };
export const LatencyOnly: StoryObj<typeof meta> = { args: { showFps: false } };
