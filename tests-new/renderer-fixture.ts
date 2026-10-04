import { PixiContext } from "../packages/client-new/src/rendering/pixi-context";
import { drawVignette, drawAtmosphere } from "../packages/client-new/src/effects";
import { drawDebuffs } from "../packages/client-new/src/combat-effects";
import { statusImages } from "../packages/client-new/src/combat-assets";
import { drawFog } from "../packages/client-new/src/forest";
import { lightTexture } from "../packages/client-new/src/village";
import { drawDamageNumber, drawDamageNumbers } from "../packages/client-new/src/damage-text";

export async function compare() {
  await Promise.all(Object.values(statusImages).map((image) => image.decode()));
  const gpu = document.createElement("canvas"),
    reference = document.createElement("canvas");
  document.body.append(gpu, reference);
  reference.width = reference.height = 256;
  const pixi = new PixiContext(gpu);
  pixi.resize(256, 256);
  await pixi.ready;
  const canvas = reference.getContext("2d")!;
  const results: Record<string, { actual: number[]; expected: number[] }> = {};
  const icons: Record<string, number> = {};
  const compare = (
    name: string,
    draw: (ctx: CanvasRenderingContext2D) => void,
    x: number,
    y: number,
  ) => {
    pixi.begin();
    canvas.reset();
    for (const ctx of [pixi as unknown as CanvasRenderingContext2D, canvas]) {
      ctx.fillStyle = "#809060";
      ctx.fillRect(0, 0, 256, 256);
      draw(ctx);
    }
    pixi.present();
    const capture = document.createElement("canvas");
    capture.width = capture.height = 256;
    const ctx = capture.getContext("2d")!;
    ctx.drawImage(gpu, 0, 0);
    results[name] = {
      actual: [...ctx.getImageData(x, y, 1, 1).data],
      expected: [...canvas.getImageData(x, y, 1, 1).data],
    };
    if (name in statusImages) {
      // Exclude the stack numeral and count colored glyph pixels, allowing the
      // small antialiasing differences between SVG scaling and nearest textures.
      const pixels = ctx.getImageData(80, 88, 12, 6).data;
      icons[name] = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const channels = [pixels[i], pixels[i + 1], pixels[i + 2]];
        if (Math.max(...channels) - Math.min(...channels) > 40) icons[name]++;
      }
      delete results[name];
    }
  };
  compare("vignette center", (ctx) => drawVignette(ctx, 0, 0, 256, 256), 128, 128);
  compare("fog blending", (ctx) => drawFog(ctx, 0, 0, 256, 256, 1000), 128, 128);
  compare("vignette edge", (ctx) => drawVignette(ctx, 0, 0, 256, 256), 5, 128);
  compare(
    "translated vignette",
    (ctx) => {
      ctx.translate(-500, -200);
      drawVignette(ctx, 500, 200, 256, 256);
    },
    128,
    128,
  );
  compare(
    "color grading",
    (ctx) => drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: true, lightShafts: false }),
    128,
    128,
  );
  compare(
    "light shafts",
    (ctx) => drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: false, lightShafts: true }),
    10,
    5,
  );
  for (const shade of ["#101817", "#b4cfdc"]) {
    compare(
      `grading ${shade}`,
      (ctx) => {
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, 256, 256);
        drawAtmosphere(ctx, 0, 0, 256, 256, 0, { colorGrading: true, lightShafts: false });
      },
      128,
      128,
    );
  }
  for (const kind of ["bleed", "poison", "burn", "roots"] as const) {
    compare(
      kind,
      (ctx) =>
        drawDebuffs(
          ctx,
          {
            id: 1,
            x: 0,
            y: 0,
            angle: 0,
            hitpoints: 100,
            debuffs: [{ kind, stacks: 1, expiresAt: 1000, nextTick: 1000, ownerId: "p" }],
          },
          80,
          100,
          0,
        ),
      81,
      89,
    );
  }
  // Shrinking/reordering a retained display list must not leave ghost sprites
  // or a previous frame's clip attached to a reused graphic.
  compare(
    "clipped red",
    (ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(30, 10);
      ctx.lineTo(30, 30);
      ctx.lineTo(10, 30);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, 80, 80);
      ctx.restore();
    },
    15,
    15,
  );
  compare(
    "released clip",
    (ctx) => {
      ctx.fillStyle = "#00ff00";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(80, 0);
      ctx.lineTo(80, 80);
      ctx.lineTo(0, 80);
      ctx.closePath();
      ctx.fill();
    },
    50,
    50,
  );
  compare("removed visuals", () => {}, 15, 15);
  compare(
    "transformed sprite",
    (ctx) => {
      ctx.translate(110, 100);
      ctx.rotate(0.3);
      ctx.scale(-2, 1.5);
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(-10, -10, 20, 20);
    },
    110,
    100,
  );
  compare(
    "reset pooled transform",
    (ctx) => {
      ctx.fillStyle = "#0000ff";
      ctx.fillRect(10, 10, 30, 30);
    },
    20,
    20,
  );

  const light = { x: 100, y: 100, radius: 80, height: 100, strength: 0.3, owner: "test" };
  const mask = document.createElement("canvas");
  mask.width = mask.height = 16;
  mask.getContext("2d")!.fillRect(0, 0, 16, 16);
  const caster = { id: "blocker", x: 120, y: 100, width: 16, height: 16, mask };
  const revision = (canvas: HTMLCanvasElement) =>
    (canvas as HTMLCanvasElement & { textureRevision: number }).textureRevision;
  const first = revision(lightTexture(light, [caster], true));
  const reused = revision(lightTexture(light, [caster], true));
  const translated = revision(lightTexture({ ...light, x: 150 }, [{ ...caster, x: 170 }], true));
  const moved = revision(lightTexture(light, [{ ...caster, x: 140 }], true));
  const toggled = revision(lightTexture(light, [caster], false));
  const lights = { first, reused, translated, moved, toggled };

  pixi.begin();
  pixi.fillStyle = "#000000";
  pixi.fillRect(0, 0, 256, 256);
  pixi.scale(8, 8);
  pixi.font = "12px sans-serif";
  pixi.textBaseline = "top";
  pixi.fillStyle = "#ffffff";
  pixi.fillText("Pixels", 2, 2);
  pixi.present();
  const glyph = document.createElement("canvas");
  glyph.width = glyph.height = 256;
  const glyphCtx = glyph.getContext("2d")!;
  glyphCtx.drawImage(gpu, 0, 0);
  const pixels = glyphCtx.getImageData(0, 0, 256, 256).data;
  // A 4x text texture at 8x world scale repeats each raster column twice. Linear filtering
  // instead introduces intermediate columns and fails this edge-grid check.
  const edges = [0, 0];
  for (let y = 0; y < 100; y++)
    for (let x = 1; x < 220; x++)
      if (pixels[(y * 256 + x) * 4] !== pixels[(y * 256 + x - 1) * 4]) edges[x % 2]++;
  glyph.style.imageRendering = "pixelated";
  document.body.append(glyph);
  // Leave both renderers showing the same composited scene for visual inspection.
  compare(
    "composite",
    (ctx) => {
      for (const [i, image] of Object.values(statusImages).entries())
        ctx.drawImage(image, 20 + i * 55, 100, 40, 40);
      drawVignette(ctx, 0, 0, 256, 256);
    },
    128,
    128,
  );
  pixi.begin();
  pixi.fillStyle = "#17251d";
  pixi.fillRect(0, 0, 256, 256);
  for (const [index, damageType] of (["physical", "fire", "poison", "nature"] as const).entries()) {
    for (const critical of [false, true])
      drawDamageNumber(
        pixi as unknown as CanvasRenderingContext2D,
        { id: index, x: 0, y: 0, amount: 15, at: 1000, target: "enemy:1", damageType, critical },
        { x: 32 + index * 64, y: critical ? 120 : 70 },
        1000,
      );
  }
  pixi.present();
  const damagePreview = document.createElement("canvas");
  damagePreview.width = damagePreview.height = 256;
  damagePreview.style.width = "512px";
  damagePreview.style.imageRendering = "pixelated";
  const damageContext = damagePreview.getContext("2d")!;
  damageContext.drawImage(gpu, 0, 0);
  document.body.append(damagePreview);
  const damagePixels = Array.from({ length: 4 }, (_, index) => {
    const pixels = damageContext.getImageData(index * 64, 50, 64, 50).data;
    let white = 0,
      red = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 235 && pixels[i + 1] > 235 && pixels[i + 2] > 235) white++;
      if (pixels[i] > 150 && pixels[i + 1] < 90 && pixels[i + 2] < 110) red++;
    }
    return { white, red };
  });
  pixi.begin();
  pixi.fillStyle = "#17251d";
  pixi.fillRect(0, 0, 256, 256);
  const groupedLabels: string[] = [];
  const fillText = pixi.fillText.bind(pixi);
  pixi.fillText = (text, x, y) => {
    groupedLabels.push(String(text));
    fillText(text, x, y);
  };
  drawDamageNumbers(
    pixi as unknown as CanvasRenderingContext2D,
    [
      {
        id: 1,
        ownerId: "mage",
        target: "enemy:1",
        damageType: "fire",
        amount: 3,
        at: 1000,
        x: 128,
        y: 128,
      },
      {
        id: 2,
        ownerId: "mage",
        target: "enemy:1",
        damageType: "fire",
        amount: 4.5,
        critical: true,
        at: 1010,
        x: 128,
        y: 128,
      },
    ],
    (x, y) => ({ x, y }),
    1010,
  );
  pixi.fillText = fillText;
  pixi.present();
  return { results, icons, lights, edges, damagePixels, groupedLabels };
}
