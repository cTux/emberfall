import type { GraphicsSettings } from './graphics';

/** Drawing cadence and resolution calibration; no simulation clock lives here. */
export class FrameBudget {
  scale = 1;
  private previous: number;
  private budgetAt: number;
  private frameTotal = 0;
  private frameCount = 0;
  private fpsAt: number;
  private fpsFrames = 0;
  private settings: GraphicsSettings;
  private resize: () => void;

  constructor(settings: GraphicsSettings, now: number, resize: () => void) {
    this.settings = settings;
    this.previous = this.budgetAt = this.fpsAt = now;
    this.resize = resize;
  }

  begin(now: number, settings: GraphicsSettings): number | undefined {
    const limit = settings.frameLimit;
    if (limit && now - this.previous + 0.5 < 1000 / limit) return;
    if (now - this.previous < 200) {
      this.frameTotal += now - this.previous;
      this.frameCount++;
    }

    if (now - this.budgetAt > 2000) {
      const target = 1000 / (limit || 60);
      const average = this.frameTotal / Math.max(1, this.frameCount);
      const next = settings.adaptiveResolution
        ? Math.max(
            0.5,
            Math.min(
              1,
              this.scale + (average > target * 1.18 ? -0.1 : average < target * 1.04 ? 0.05 : 0),
            ),
          )
        : 1;
      if (Math.abs(next - this.scale) > 0.001) {
        this.scale = next;
        this.resize();
      }

      this.budgetAt = now;
      this.frameTotal = 0;
      this.frameCount = 0;
    }

    const delta = Math.min(0.1, (now - this.previous) / 1000);
    this.previous = now;
    if (this.settings !== settings) {
      this.settings = settings;
      this.scale = 1;
      this.resize();
    }

    return delta;
  }

  sample(now: number): number | undefined {
    this.fpsFrames++;
    if (now - this.fpsAt < 500) return;
    const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsAt));
    this.fpsFrames = 0;
    this.fpsAt = now;

    return fps;
  }
}
