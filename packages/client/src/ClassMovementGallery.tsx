import { useEffect, useRef, useState } from 'react';
import { actorArt, drawArt } from './art';
import { playerFrame } from './animation';

// Match the six 80 ms player walking poses; preview travel is intentionally slower than gameplay to expose foot contact.
const WALK_PREVIEW = {
  stepMs: 80,
  frames: 6,
  directions: 4,
  travelMsPerPixel: 18,
  travelSpan: 60,
  travelCenter: 30,
  leftColumn: 2,
  rightColumn: 3,
} as const;
// Existing inspection grid holds an enlarged sprite and a game-size copy in each fixed cell.
const WALK_GRID = {
  columnLabelX: 190,
  columnStride: 260,
  rowLabelY: 80,
  rowStride: 215,
  cellX: 65,
  cellY: 45,
} as const;

const classes = ['warrior', 'ranger', 'mage', 'druid'];
const directions = ['Down ↓', 'Up ↑', 'Left ←', 'Right →'];
const images = classes.map(actorArt);

/** Same atlas and gait selector as village/forest, without a world connection. */
export function ClassMovementGallery() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const [paused, setPaused] = useState(false);
  const [travel, setTravel] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const element = canvas.current!;
    const ctx = element.getContext('2d')!;
    let request = 0;
    let previous = performance.now();

    function draw(now: number) {
      if (!paused) {
        elapsed.current += (now - previous) * speed;
      }

      previous = now;
      const clock = paused ? step * WALK_PREVIEW.stepMs : elapsed.current;
      const row = playerFrame(clock, true, true);
      ctx.fillStyle = '#18231f';
      ctx.fillRect(0, 0, 1120, 920);
      ctx.imageSmoothingEnabled = false;
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eddfc1';
      directions.forEach((label, col) => {
        return ctx.fillText(label, WALK_GRID.columnLabelX + col * WALK_GRID.columnStride, 30);
      });
      images.forEach((image, index) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#eddfc1';
        ctx.fillText(classes[index], 12, WALK_GRID.rowLabelY + index * WALK_GRID.rowStride);

        for (let col = 0; col < WALK_PREVIEW.directions; col++) {
          const x = WALK_GRID.cellX + col * WALK_GRID.columnStride;
          const y = WALK_GRID.cellY + index * WALK_GRID.rowStride;
          ctx.strokeStyle = '#35493e';
          ctx.strokeRect(x, y, 250, 205);
          const distance = travel
            ? ((clock / WALK_PREVIEW.travelMsPerPixel) % WALK_PREVIEW.travelSpan) -
              WALK_PREVIEW.travelCenter
            : 0;
          const dx =
            col === WALK_PREVIEW.leftColumn
              ? -distance
              : col === WALK_PREVIEW.rightColumn
                ? distance
                : 0;
          const dy = col === 0 ? distance : col === 1 ? -distance : 0;
          drawArt(ctx, image, col, row, x + 50 + dx, y + 22 + dy, 128, 128);
          drawArt(ctx, image, col, row, x + 192, y + 145, 48, 48);
        }
      });
      element.dataset.ready = String(
        images.every((image) => {
          return image.complete && image.naturalWidth > 0;
        }),
      );
      element.dataset.frame = String(row);
      element.dataset.travel = String(travel);
      request = requestAnimationFrame(draw);
    }

    request = requestAnimationFrame(draw);

    return () => {
      return cancelAnimationFrame(request);
    };
  }, [paused, travel, speed, step]);

  return (
    <main
      style={{
        height: '100dvh',
        overflow: 'auto',
        padding: 24,
        boxSizing: 'border-box',
        background: '#101915',
        color: '#eddfc1',
      }}
    >
      <h1>Class movement</h1>
      <p>Every class, every direction. Enlarged walkers with a game-size copy in each corner.</p>
      <div
        style={{
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => {
            if (paused) {
              elapsed.current = step * WALK_PREVIEW.stepMs;
            } else {
              setStep(Math.floor(elapsed.current / WALK_PREVIEW.stepMs) % WALK_PREVIEW.frames);
            }

            setPaused(!paused);
          }}
        >
          {paused ? 'Play' : 'Pause'}
        </button>
        <button
          onClick={() => {
            const current = paused
              ? step
              : Math.floor(elapsed.current / WALK_PREVIEW.stepMs) % WALK_PREVIEW.frames;
            setPaused(true);
            setStep((current + 1) % WALK_PREVIEW.frames);
          }}
        >
          Next frame
        </button>
        <label>
          <input
            type='checkbox'
            checked={travel}
            onChange={(event) => {
              return setTravel(event.target.checked);
            }}
          />{' '}
          Travel
        </label>
        <label>
          Speed{' '}
          <select
            aria-label='Speed'
            value={speed}
            onChange={(event) => {
              return setSpeed(Number(event.target.value));
            }}
          >
            <option value={0.25}>¼ speed</option>
            <option value={0.5}>½ speed</option>
            <option value={1}>Normal</option>
          </select>
        </label>
        <a href='/?art-gallery' style={{ color: '#edc48a' }}>
          All assets
        </a>
        <a href='/' style={{ color: '#edc48a' }}>
          Open game
        </a>
      </div>
      <canvas
        ref={canvas}
        width={1120}
        height={920}
        aria-label='All classes walking in four directions'
        style={{
          position: 'static',
          display: 'block',
          width: '100%',
          maxWidth: 1120,
          height: 'auto',
          imageRendering: 'pixelated',
        }}
      />
    </main>
  );
}
