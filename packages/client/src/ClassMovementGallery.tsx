import { useEffect, useRef, useState } from "react";
import { actorArt, drawArt } from "./art";
import { playerFrame } from "./animation";

const classes = ["warrior", "ranger", "mage", "druid"];
const directions = ["Down ↓", "Up ↑", "Left ←", "Right →"];
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
    const ctx = element.getContext("2d")!;
    let request = 0;
    let previous = performance.now();
    function draw(now: number) {
      if (!paused) elapsed.current += (now - previous) * speed;
      previous = now;
      const clock = paused ? step * 80 : elapsed.current;
      const row = playerFrame(clock, true, true);
      ctx.fillStyle = "#18231f";
      ctx.fillRect(0, 0, 1120, 920);
      ctx.imageSmoothingEnabled = false;
      ctx.font = "18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#eddfc1";
      directions.forEach((label, col) => ctx.fillText(label, 190 + col * 260, 30));
      images.forEach((image, index) => {
        ctx.textAlign = "left";
        ctx.fillStyle = "#eddfc1";
        ctx.fillText(classes[index], 12, 80 + index * 215);
        for (let col = 0; col < 4; col++) {
          const x = 65 + col * 260;
          const y = 45 + index * 215;
          ctx.strokeStyle = "#35493e";
          ctx.strokeRect(x, y, 250, 205);
          const distance = travel ? ((clock / 18) % 60) - 30 : 0;
          const dx = col === 2 ? -distance : col === 3 ? distance : 0;
          const dy = col === 0 ? distance : col === 1 ? -distance : 0;
          drawArt(ctx, image, col, row, x + 50 + dx, y + 22 + dy, 128, 128);
          drawArt(ctx, image, col, row, x + 192, y + 145, 48, 48);
        }
      });
      element.dataset.ready = String(
        images.every((image) => image.complete && image.naturalWidth > 0),
      );
      element.dataset.frame = String(row);
      element.dataset.travel = String(travel);
      request = requestAnimationFrame(draw);
    }
    request = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(request);
  }, [paused, travel, speed, step]);
  return (
    <main
      style={{
        height: "100dvh",
        overflow: "auto",
        padding: 24,
        boxSizing: "border-box",
        background: "#101915",
        color: "#eddfc1",
      }}
    >
      <h1>Class movement</h1>
      <p>Every class, every direction. Enlarged walkers with a game-size copy in each corner.</p>
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => {
            if (paused) elapsed.current = step * 80;
            else setStep(Math.floor(elapsed.current / 80) % 6);
            setPaused(!paused);
          }}
        >
          {paused ? "Play" : "Pause"}
        </button>
        <button
          onClick={() => {
            const current = paused ? step : Math.floor(elapsed.current / 80) % 6;
            setPaused(true);
            setStep((current + 1) % 6);
          }}
        >
          Next frame
        </button>
        <label>
          <input
            type="checkbox"
            checked={travel}
            onChange={(event) => setTravel(event.target.checked)}
          />{" "}
          Travel
        </label>
        <label>
          Speed{" "}
          <select
            aria-label="Speed"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            <option value={0.25}>¼ speed</option>
            <option value={0.5}>½ speed</option>
            <option value={1}>Normal</option>
          </select>
        </label>
        <a href="/?art-gallery" style={{ color: "#edc48a" }}>
          All assets
        </a>
        <a href="/" style={{ color: "#edc48a" }}>
          Open game
        </a>
      </div>
      <canvas
        ref={canvas}
        width={1120}
        height={920}
        aria-label="All classes walking in four directions"
        style={{
          position: "static",
          display: "block",
          width: "100%",
          maxWidth: 1120,
          height: "auto",
          imageRendering: "pixelated",
        }}
      />
    </main>
  );
}
