import { useEffect, useRef, useState } from 'react';
import { artUrl } from './art';
import { drawAssetGalleryFrame } from './asset-gallery-frame';
const names = ['warrior', 'ranger', 'mage', 'druid'];

/** Inspect the very same packaged frames used by the game, without joining a world. */
export function AssetGallery() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const [action, setAction] = useState('walk');
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const [background, setBackground] = useState('#26352b');
  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!;
    let request = 0,
      previous = performance.now();

    function draw(now: number) {
      if (!paused) {
        elapsed.current += now - previous;
      }

      const clock = elapsed.current;
      previous = now;
      drawAssetGalleryFrame(ctx, clock, action, direction, background);
      request = requestAnimationFrame(draw);
    }

    request = requestAnimationFrame(draw);

    return () => {
      return cancelAnimationFrame(request);
    };
  }, [action, direction, paused, background]);

  return (
    <main
      style={{
        height: '100dvh',
        overflow: 'auto',
        background: '#171c18',
        color: '#eedebc',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <h1>Emberfall · animated wardrobe-style assets</h1>
      <p>
        Live frames used by the new client. Choose an action and direction to inspect the animation.
      </p>
      <p>
        <a href='/?class-movement'>All classes walking in every direction</a>
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <label>
          Action{' '}
          <select
            aria-label='Animation'
            value={action}
            onChange={(e) => {
              return setAction(e.target.value);
            }}
          >
            {['idle', 'walk', 'attack', 'fallen'].map((value) => {
              return <option key={value}>{value}</option>;
            })}
          </select>
        </label>
        <label>
          Direction{' '}
          <select
            aria-label='Direction'
            value={direction}
            onChange={(e) => {
              return setDirection(Number(e.target.value));
            }}
          >
            {['Down', 'Up', 'Left', 'Right'].map((label, i) => {
              return (
                <option key={label} value={i}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
        <button
          onClick={() => {
            return setPaused(!paused);
          }}
        >
          {paused ? 'Play' : 'Pause'}
        </button>
        <label>
          Background{' '}
          <input
            type='color'
            aria-label='Background'
            value={background}
            onChange={(e) => {
              return setBackground(e.target.value);
            }}
          />
        </label>
        <a href='/' style={{ color: '#edc48a' }}>
          Open game
        </a>
      </div>
      <canvas
        ref={canvas}
        width={1200}
        height={1040}
        style={{
          position: 'static',
          display: 'block',
          inset: 'auto',
          width: '100%',
          maxWidth: 1200,
          height: 'auto',
          imageRendering: 'pixelated',
        }}
        aria-label='Animated asset gallery'
      />
      <h2>Portraits and icons</h2>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {[
          ...names.slice(0, 4).map((name) => {
            return `${name}-portrait`;
          }),
          ...names.slice(0, 4).map((name) => {
            return `${name}-weapon`;
          }),
          'bleed',
          'poison',
          'burn',
          'roots',
          'silence',
        ].map((name) => {
          return (
            <img
              key={name}
              src={artUrl(name)}
              width={64}
              height={64}
              alt={name}
              style={{ imageRendering: 'pixelated' }}
            />
          );
        })}
      </div>
      <p>
        Generated art based on the approved wardrobe concepts. LPC Wooden Furniture reference
        credits and license are retained in the asset directory.
      </p>
    </main>
  );
}
