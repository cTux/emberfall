import { MILLISECONDS_PER_SECOND } from '@emberfall/common';
import type { GraphicsSettings } from './graphics';

// Existing adaptive-resolution calibration trades a gradual recovery for faster relief under sustained load.
const FRAME_BUDGET = {
  cadenceSlackMs: 0.5,
  stallMs: 200,
  evaluationMs: 2000,
  defaultFps: 60,
  minimumScale: 0.5,
  overloadRatio: 1.18,
  recoveryRatio: 1.04,
  downStep: 0.1,
  upStep: 0.05,
  scaleEpsilon: 0.001,
  maximumDeltaSeconds: 0.1,
  fpsSampleMs: 500,
} as const;

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

    if (
      limit &&
      now - this.previous + FRAME_BUDGET.cadenceSlackMs < MILLISECONDS_PER_SECOND / limit
    ) {
      return;
    }

    if (now - this.previous < FRAME_BUDGET.stallMs) {
      this.frameTotal += now - this.previous;
      this.frameCount++;
    }

    if (now - this.budgetAt > FRAME_BUDGET.evaluationMs) {
      const target = MILLISECONDS_PER_SECOND / (limit || FRAME_BUDGET.defaultFps);
      const average = this.frameTotal / Math.max(1, this.frameCount);
      const next = settings.adaptiveResolution
        ? Math.max(
            FRAME_BUDGET.minimumScale,
            Math.min(
              1,
              this.scale +
                (average > target * FRAME_BUDGET.overloadRatio
                  ? -FRAME_BUDGET.downStep
                  : average < target * FRAME_BUDGET.recoveryRatio
                    ? FRAME_BUDGET.upStep
                    : 0),
            ),
          )
        : 1;

      if (Math.abs(next - this.scale) > FRAME_BUDGET.scaleEpsilon) {
        this.scale = next;
        this.resize();
      }

      this.budgetAt = now;
      this.frameTotal = 0;
      this.frameCount = 0;
    }

    const delta = Math.min(
      FRAME_BUDGET.maximumDeltaSeconds,
      (now - this.previous) / MILLISECONDS_PER_SECOND,
    );
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

    if (now - this.fpsAt < FRAME_BUDGET.fpsSampleMs) {
      return;
    }

    const fps = Math.round((this.fpsFrames * MILLISECONDS_PER_SECOND) / (now - this.fpsAt));
    this.fpsFrames = 0;
    this.fpsAt = now;

    return fps;
  }
}
