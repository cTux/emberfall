import { drawTorchFire } from "./village";
import { useEffect, useRef, useState } from "react";
import {
  actorArt,
  animalArt,
  bearArt,
  wardrobeArt,
  environmentArt,
  effectsArt,
  drawArt,
  artImages,
  artUrl,
} from "./art";
import { actorFrame, playerFrame, idleBreath } from "./animation";
import { drawStonePortal, drawChimneySmoke, chimneyAnchors } from "./ambient-art";

const names = [
  "warrior",
  "ranger",
  "mage",
  "druid",
  "skeleton",
  "runner",
  "brute",
  "caster",
  "warden",
];
const actors = names.map(actorArt);

/** Inspect the very same packaged frames used by the game, without joining a world. */
export function AssetGallery() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const [action, setAction] = useState("walk");
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const [background, setBackground] = useState("#26352b");
  useEffect(() => {
    const ctx = canvas.current!.getContext("2d")!;
    let request = 0,
      previous = performance.now();
    function draw(now: number) {
      if (!paused) elapsed.current += now - previous;
      const clock = elapsed.current;
      previous = now;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1200, 1040);
      ctx.imageSmoothingEnabled = false;
      ctx.font = '18px "Alegreya Sans", sans-serif';
      ctx.textAlign = "center";
      const row =
        action === "attack"
          ? actorFrame(clock % 780, false, true, 0, 600)
          : action === "fallen"
            ? 7
            : actorFrame(clock, action === "walk", true);
      actors.forEach((image, i) => {
        const x = 20 + (i % 5) * 235,
          y = 20 + Math.floor(i / 5) * 200;
        const actorRow =
          i < 4
            ? playerFrame(
                action === "attack" ? clock % 780 : clock,
                action === "walk",
                action !== "fallen",
                action === "attack" ? 0 : -Infinity,
                600,
              )
            : row;
        const breath = idleBreath(clock, actorRow);
        drawArt(ctx, image, direction, actorRow, x + 45, y + 144 * (1 - breath), 144, 144 * breath);
        ctx.fillStyle = "#eedebc";
        ctx.fillText(names[i], x + 117, y + 169);
      });
      for (let i = 0; i < 4; i++) {
        drawArt(
          ctx,
          animalArt,
          i,
          action === "fallen"
            ? 5
            : action === "attack"
              ? 4
              : action === "idle"
                ? 0
                : 1 + (Math.floor(clock / 150) % 3),
          55 + i * 230,
          425,
          120,
          120,
        );
        ctx.fillText(["Boar", "Cat", "Chicken", "Raccoon"][i], 115 + i * 230, 565);
      }
      const bearFrame =
        action === "fallen"
          ? 7
          : action === "attack"
            ? 5 + (Math.floor(clock / 150) % 2)
            : action === "idle"
              ? 0
              : 1 + (Math.floor(clock / 150) % 4);
      drawArt(ctx, bearArt, bearFrame % 4, Math.floor(bearFrame / 4), 980, 440, 110, 110);
      ctx.fillText("Bear cub", 1035, 565);
      const door = [0, 0, 1, 2, 3, 3, 2, 1][Math.floor(clock / 220) % 8];
      drawArt(ctx, wardrobeArt, door, 0, 30, 600, 176, 176, 128);
      drawArt(ctx, effectsArt, Math.floor(clock / 150) % 4, 0, 240, 600, 160, 160, 128);
      drawStonePortal(ctx, 430, 600, 176, 176, clock);
      drawArt(ctx, effectsArt, Math.floor(clock / 120) % 3, 2, 660, 620, 140, 140, 128);
      drawArt(ctx, effectsArt, Math.floor(clock / 120) % 3, 3, 865, 620, 140, 140, 128);
      ["Wardrobe", "Lantern", "Portal", "Fireball", "Roots"].forEach((name, i) =>
        ctx.fillText(name, 120 + i * 200, 798),
      );
      for (let i = 0; i < 9; i++) {
        if (i === 6) drawTorchFire(ctx, 10 + i * 132 + 63, 1000, clock, true, false, 126, 160);
        else
          drawArt(ctx, environmentArt, i % 3, Math.floor(i / 3), 10 + i * 132, 840, 126, 160, 128);
        if (i < 3)
          drawChimneySmoke(
            ctx,
            10 + i * 132 + chimneyAnchors[i].x * 126,
            840 + chimneyAnchors[i].y * 160,
            clock,
          );
      }
      canvas.current!.dataset.ready = String(
        artImages.every(
          (image) => image.complete && image.naturalWidth > 0 && image.dataset.artReady === "true",
        ),
      );
      canvas.current!.dataset.frame = String(row);
      request = requestAnimationFrame(draw);
    }
    request = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(request);
  }, [action, direction, paused, background]);
  return (
    <main
      style={{
        height: "100dvh",
        overflow: "auto",
        background: "#171c18",
        color: "#eedebc",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <h1>Emberfall · animated wardrobe-style assets</h1>
      <p>
        Live frames used by the new client. Choose an action and direction to inspect the animation.
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <label>
          Action{" "}
          <select aria-label="Animation" value={action} onChange={(e) => setAction(e.target.value)}>
            {["idle", "walk", "attack", "fallen"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Direction{" "}
          <select
            aria-label="Direction"
            value={direction}
            onChange={(e) => setDirection(Number(e.target.value))}
          >
            {["Down", "Up", "Left", "Right"].map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setPaused(!paused)}>{paused ? "Play" : "Pause"}</button>
        <label>
          Background{" "}
          <input
            type="color"
            aria-label="Background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          />
        </label>
        <a href="/" style={{ color: "#edc48a" }}>
          Open game
        </a>
      </div>
      <canvas
        ref={canvas}
        width={1200}
        height={1040}
        style={{
          position: "static",
          display: "block",
          inset: "auto",
          width: "100%",
          maxWidth: 1200,
          height: "auto",
          imageRendering: "pixelated",
        }}
        aria-label="Animated asset gallery"
      />
      <h2>Portraits and icons</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[
          ...names.slice(0, 4).map((name) => `${name}-portrait`),
          ...names.slice(0, 4).map((name) => `${name}-weapon`),
          "bleed",
          "poison",
          "burn",
          "roots",
        ].map((name) => (
          <img
            key={name}
            src={artUrl(name)}
            width={64}
            height={64}
            alt={name}
            style={{ imageRendering: "pixelated" }}
          />
        ))}
      </div>
      <p>
        Generated art based on the approved wardrobe concepts. LPC Wooden Furniture reference
        credits and license are retained in the asset directory.
      </p>
    </main>
  );
}
